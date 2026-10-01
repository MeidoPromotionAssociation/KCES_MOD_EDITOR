import React from "react";
import {Button, InputNumber, Space, Switch, Tooltip, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {snapToStep} from "../../utils/magicaClothMeta.ts";
import {BezierCurveValueRange, bezierRangeFor, type BezierRange} from "../../utils/clothParamsMeta.ts";

/**
 * BezierParamField MagicaCloth BezierParam 曲线参数控件
 * 结构：startValue / endValue / useEndValue / curveValue / useCurveValue
 * 提供紧凑行内编辑 + 迷你曲线预览（按 MagicaCloth 的 start→end 曲线语义近似绘制）
 *
 * 五个子字段都是 BezierParam 自己的成员，不属于 ClothParams 的顶层字段，
 * 所以文案用独立的 ClothParamsEditor.bezier_* 键；说明里带上原始字段名方便对着源码看
 *
 * BezierParam 里没有关键帧（不像 MagicaCloth2 的 CurveSerializeData），
 * 曲线完全由 start / end / curve 三个数决定，所以展开后给的是「拖三个控制点」的图，
 * 而不是关键帧编辑器。
 */

// 行内迷你预览尺寸
const PreviewWidth = 72;
const PreviewHeight = 28;

// 展开后的曲线编辑器尺寸与绘图区
const CurveWidth = 420;
const CurveHeight = 180;
const PlotX0 = 48;
const PlotX1 = 404;
const PlotY0 = 14;
const PlotY1 = 146;
// 采样点数：二次贝塞尔用直线连也足够平滑
const SampleCount = 41;

/**
 * bezierValue 游戏侧 BezierParam.Evaluate 的等价实现
 * MagicaCloth/BezierParam.cs:Evaluate → MathUtility.GetBezierValue：
 * curve 为 0 时退化成直线，否则控制点 = lerp(end, start, curve*0.5+0.5) 的二次贝塞尔
 */
function bezierValue(start: number, end: number, curve: number, t: number): number {
    if (curve === 0) {
        return start + (end - start) * t;
    }
    const mid = end + (start - end) * (curve * 0.5 + 0.5);
    const inv = 1 - t;
    return inv * inv * start + 2 * inv * t * mid + t * t * end;
}

// bezierPreview 用 curveValue 弯曲 start→end 的近似预览曲线
function bezierPreview(item: any) {
    const start = Number(item?.startValue) || 0;
    const end = item?.useEndValue ? (Number(item?.endValue) || 0) : start;
    // 与游戏一致：CurveValue 要 useEndValue 和 useCurveValue 同时为真才有值
    const curve = (item?.useEndValue && item?.useCurveValue) ? (Number(item?.curveValue) || 0) : 0;

    // 归一化到 0-1 显示（取两端的 min/max，避免数值范围差异过大）
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const span = high - low || 1;
    const normalize = (v: number) => 1 - (v - low) / span;

    const y0 = normalize(start) * (PreviewHeight - 8) + 4;
    const y1 = normalize(end) * (PreviewHeight - 8) + 4;
    // curveValue -1..1 控制中点偏移
    const midY = (y0 + y1) / 2 - curve * (PreviewHeight / 2 - 4);

    return (
        <svg width={PreviewWidth} height={PreviewHeight}
             style={{background: "rgba(128,128,128,0.08)", borderRadius: 4, flexShrink: 0}}>
            <path
                d={`M 2 ${y0} Q ${PreviewWidth / 2} ${midY}, ${PreviewWidth - 2} ${y1}`}
                fill="none"
                stroke="#1890ff"
                strokeWidth="1.5"
            />
        </svg>
    );
}

/**
 * BezierParamCurveEditor 展开后的可拖拽曲线图
 * 三个控制点：左端改 startValue、右端改 endValue、中段改 curveValue（反解，限幅到 -1~1）
 * 端点/曲率未启用时对应的控制点置灰不可拖，和右侧数值框的置灰规则一致
 */
/**
 * curveAxis 纵轴量程
 *
 * 有界面参考范围时直接拿它当量程（两侧留 2% 边距，免得贴边的控制点被裁掉），
 * 数据超出范围时再放宽到能容下数据 —— 这样"框"就是允许范围：
 * 一眼看得出当前值落在范围的哪个位置，也才有地方可拖。
 * 反过来按当前值自动适配的话，曲线永远刚好填满图，框就失去意义了。
 *
 * 没有参考范围时才退回按曲线实际范围适配；常量参数（起点=终点）没有跨度，
 * 用与量级相关的窄窗口兜底
 */
function curveAxis(samples: number[], start: number, end: number, range?: BezierRange) {
    const lo0 = Math.min(start, end, ...samples);
    const hi0 = Math.max(start, end, ...samples);
    if (range) {
        const pad = (range.max - range.min) * 0.02;
        return {
            lo: Math.min(range.min, lo0) - pad,
            hi: Math.max(range.max, hi0) + pad,
        };
    }
    const span = hi0 - lo0;
    const pad = span > 1e-9 ? span * 0.12 : Math.max(Math.abs(hi0) * 0.05, 1e-4);
    return {lo: lo0 - pad, hi: hi0 + pad};
}

/**
 * stepFor 按纵轴跨度推算拖拽步长
 * 不能用 magicaClothMeta 的 defaultStep：它按绝对跨度分档，最小档是 0.001，
 * 而常量参数（如 radius=0.01）的量程只有 0.0002，步长比整个量程还大好几倍，一拖就飞。
 * 这里改成「整条纵轴约 100 个停靠位」的数量级步长
 */
function stepFor(span: number): number {
    if (!(span > 0)) {
        return 1e-6;
    }
    const raw = span / 100;
    return Math.pow(10, Math.floor(Math.log10(raw)));
}

type Handle = "start" | "end" | "curve";

/**
 * BezierParamCurveEditor 展开后的可拖拽曲线图
 * 三个控制点：左端改 startValue、右端改 endValue、中段改 curveValue（反解，限幅到 -1~1）
 * 端点/曲率未启用时对应的控制点置灰不可拖，和右侧数值框的置灰规则一致
 *
 * 三个细节都为了手感：
 * - 纵轴量程在按下时冻结，拖完才重算。量程随值重算的话，值一变量程跟着变，
 * 控制点会在光标下跳走，而且越拖量程越大
 * - pointermove 用 requestAnimationFrame 合并成一帧一次，并跳过"吸附后值没变"的提交；
 * 尺寸只在按下时量一次，避免每次移动都 getBoundingClientRect 强制同步布局
 * - 拖拽值限制在参数参考范围内；控制点画到边界就停住，不会跑出图外
 */
const BezierParamCurveEditor: React.FC<{
    value: any;
    onChange: (next: any) => void;
    range?: BezierRange;
}> = ({value, onChange, range}) => {
    const {t} = useTranslation();
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const [dragging, setDragging] = React.useState<Handle | null>(null);
    const dragRef = React.useRef<{
        which: Handle;
        field: string;
        lo: number;
        hi: number;
        top: number;
        scale: number;
        start: number;
        end: number;
        last: number;
    } | null>(null);
    const frameRef = React.useRef<number | null>(null);
    const pendingYRef = React.useRef<number | null>(null);
    // rAF 回调里拿到的闭包可能是上一帧的，值要从 ref 读最新的，否则会把上一次提交冲掉
    const valueRef = React.useRef(value);
    valueRef.current = value;
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;
    const clipId = "bezierPlot" + React.useId().replace(/:/g, "");

    const start = Number(value?.startValue) || 0;
    // 文件里存的终点值：拖终点手柄会顺带打开「启用终点」，所以反解曲率要用它而不是当前生效的终点
    const rawEnd = Number(value?.endValue) || 0;
    const useEnd = !!value?.useEndValue;
    const end = useEnd ? rawEnd : start;
    const useCurve = useEnd && !!value?.useCurveValue;
    const curve = useCurve ? (Number(value?.curveValue) || 0) : 0;

    const samples: number[] = [];
    for (let i = 0; i <= SampleCount; i++) {
        samples.push(bezierValue(start, end, curve, i / SampleCount));
    }
    const live = curveAxis(samples, start, end, range);
    // 拖动期间用量程快照
    const lo = dragging && dragRef.current ? dragRef.current.lo : live.lo;
    const hi = dragging && dragRef.current ? dragRef.current.hi : live.hi;

    const toX = (ratio: number) => PlotX0 + ratio * (PlotX1 - PlotX0);
    const toY = (v: number) => PlotY1 - ((v - lo) / (hi - lo)) * (PlotY1 - PlotY0);
    // 控制点画到边界就停住，值可以继续变（数值框里能看到）
    const toHandleY = (v: number) => Math.min(PlotY1, Math.max(PlotY0, toY(v)));
    const fromY = (y: number, low: number, high: number) =>
        low + ((PlotY1 - y) / (PlotY1 - PlotY0)) * (high - low);

    const curvePath = samples
        .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i / SampleCount).toFixed(2)} ${toY(v).toFixed(2)}`)
        .join(" ");

    const handleAt = (which: Handle) => {
        if (which === "start") return {x: toX(0), y: toHandleY(start)};
        // 终点手柄画在「存起来的终点值」上：没启用终点时它不会和起点手柄叠在一起，
        // 顺便也提示这个端点还没生效
        if (which === "end") return {x: toX(1), y: toHandleY(rawEnd)};
        return {x: toX(0.5), y: toHandleY(bezierValue(start, end, curve, 0.5))};
    };

    /**
     * 拖拽值的上下界：只限制在按下那一刻冻结的纵轴量程里（也就是"框"内）。
     * 量程本身已经是「参考范围 ∪ 实际数据」，所以手输过更大的值之后框会跟着放宽、拖拽也够得着
     */
    const clampDragValue = (v: number, box: {lo: number; hi: number}) =>
        Math.min(box.hi, Math.max(box.lo, v));

    const onHandleDown = (which: Handle) => (e: React.PointerEvent) => {
        e.preventDefault();
        const svg = svgRef.current;
        if (!svg) {
            return;
        }
        svg.setPointerCapture(e.pointerId);
        const rect = svg.getBoundingClientRect();
        dragRef.current = {
            which,
            field: which === "start" ? "startValue" : which === "end" ? "endValue" : "curveValue",
            lo,
            hi,
            top: rect.top,
            scale: rect.width / CurveWidth,
            start,
            // 反解曲率要用「存起来的终点值」：拖中点会顺带打开「启用终点」，生效的就是它
            end: rawEnd,
            last: which === "start" ? start : which === "end" ? rawEnd : curve,
        };
        setDragging(which);
    };

    const commit = () => {
        frameRef.current = null;
        const drag = dragRef.current;
        const ySvg = pendingYRef.current;
        if (!drag || ySvg === null) {
            return;
        }
        const next = clampDragValue(
            snapToStep(fromY(ySvg, drag.lo, drag.hi), stepFor(drag.hi - drag.lo)),
            {lo: drag.lo, hi: drag.hi},
        );
        if (next === drag.last) {
            return;
        }
        if (drag.which === "curve") {
            // 反解 curveValue：B(0.5) = 0.25*start + 0.5*mid + 0.25*end
            if (Math.abs(drag.start - drag.end) < 1e-9) {
                return;
            }
            const mid = 2 * next - 0.5 * (drag.start + drag.end);
            const ratio = (mid - drag.end) / (drag.start - drag.end);
            const solved = Math.min(1, Math.max(-1, 2 * ratio - 1));
            const rounded = Math.round(solved * 1000) / 1000;
            if (rounded === drag.last) {
                return;
            }
            drag.last = rounded;
            // 拖中点等于明确要加曲率：把「启用终点」「启用曲率」一起打开，省得先去找开关
            onChangeRef.current({
                ...valueRef.current,
                curveValue: rounded,
                useCurveValue: true,
                useEndValue: true,
            });
            return;
        }
        drag.last = next;
        // 拖终点手柄等于明确要用终点值，顺手打开「启用终点」
        if (drag.which === "end") {
            onChangeRef.current({...valueRef.current, endValue: next, useEndValue: true});
            return;
        }
        onChangeRef.current({...valueRef.current, [drag.field]: next});
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) {
            return;
        }
        pendingYRef.current = (e.clientY - drag.top) / drag.scale;
        if (frameRef.current !== null) {
            return;
        }
        frameRef.current = requestAnimationFrame(commit);
    };

    const endDrag = (e: React.PointerEvent) => {
        if (!dragRef.current) {
            return;
        }
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        dragRef.current = null;
        pendingYRef.current = null;
        svgRef.current?.releasePointerCapture(e.pointerId);
        setDragging(null);
    };

    React.useEffect(() => () => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
        }
    }, []);

    /**
     * 三个控制点都能拖，拖动即自动打开对应开关：
     * - 终点手柄 → 打开「启用终点」并写 endValue
     * - 中点手柄 → 打开「启用终点」+「启用曲率」并写 curveValue
     * 中点只在起点和终点相同时置灰：那时曲线是水平线、曲率怎么调都没意义，
     * 得先把终点拖开（或直接改数值）才有可塑的曲线
     */
    const handles: Array<{which: Handle; enabled: boolean; color: string}> = [
        {which: "start", enabled: true, color: "#185FA5"},
        {which: "end", enabled: true, color: "#185FA5"},
        {which: "curve", enabled: Math.abs(start - rawEnd) > 1e-9, color: "#D85A30"},
    ];

    return (
        <div style={{margin: "6px 0 8px"}}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${CurveWidth} ${CurveHeight}`}
                width="100%"
                style={{maxWidth: CurveWidth, display: "block", touchAction: "none",
                    background: "rgba(128,128,128,0.06)", borderRadius: 6, cursor: dragging ? "grabbing" : "default"}}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <defs>
                    <clipPath id={clipId}>
                        <rect x={PlotX0} y={PlotY0} width={PlotX1 - PlotX0} height={PlotY1 - PlotY0}/>
                    </clipPath>
                </defs>
                <line x1={PlotX0} y1={PlotY1} x2={PlotX1} y2={PlotY1} stroke="#888" strokeWidth="0.5" opacity="0.5"/>
                <line x1={PlotX0} y1={PlotY0} x2={PlotX0} y2={PlotY1} stroke="#888" strokeWidth="0.5" opacity="0.5"/>
                <g clipPath={`url(#${clipId})`}>
                    {/* 直线参考：曲线与它拉开多少就是 curveValue 的作用 */}
                    <line x1={toX(0)} y1={toY(start)} x2={toX(1)} y2={toY(end)}
                          stroke="#888" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.7"/>
                    <path d={curvePath} fill="none" stroke="#1890ff" strokeWidth="2"/>
                </g>
                {handles.map((item) => {
                    const at = handleAt(item.which);
                    return (
                        <circle
                            key={item.which}
                            cx={at.x}
                            cy={at.y}
                            r={5}
                            fill="#fff"
                            stroke={item.color}
                            strokeWidth="2"
                            opacity={item.enabled ? 1 : 0.3}
                            style={{cursor: item.enabled ? "grab" : "not-allowed"}}
                            onPointerDown={item.enabled ? onHandleDown(item.which) : undefined}
                        />
                    );
                })}
                <text x={PlotX0} y={PlotY1 + 14} fontSize="10" fill="#888">
                    {t('ClothParamsEditor.bezier_axis_fixed')}
                </text>
                <text x={PlotX1} y={PlotY1 + 14} fontSize="10" fill="#888" textAnchor="end">
                    {t('ClothParamsEditor.bezier_axis_moving')}
                </text>
                <text x={PlotX0 - 6} y={PlotY0 + 4} fontSize="10" fill="#888" textAnchor="end">
                    {hi.toFixed(3)}
                </text>
                <text x={PlotX0 - 6} y={PlotY1} fontSize="10" fill="#888" textAnchor="end">
                    {lo.toFixed(3)}
                </text>
            </svg>
            <div style={{fontSize: 12, color: "rgba(128,128,128,0.9)", marginTop: 4, maxWidth: CurveWidth}}>
                {t('ClothParamsEditor.bezier_curve_hint')}
            </div>
        </div>
    );
};

const BezierParamField: React.FC<{
    /** 所属的 ClothParams 字段名，用来查这个参数的参考范围 */
    field?: string;
    value: any;
    onChange: (next: any) => void;
}> = ({field, value, onChange}) => {
    const {t} = useTranslation();
    // 与 MagicaCloth2 的 CurveDataField 一致：本来就在用曲率的参数默认展开，纯直线参数保持紧凑
    const [expanded, setExpanded] = React.useState(!!value?.useEndValue && !!value?.useCurveValue);
    const set = (name: string, fieldValue: any) => onChange({...value, [name]: fieldValue});

    const range = field ? bezierRangeFor(field) : undefined;

    const label = (name: string) => t(`ClothParamsEditor.bezier_${name}`, {defaultValue: name});
    const tip = (name: string) => t(`ClothParamsEditor.bezier_${name}_tip`, {defaultValue: name});

    /**
     * 输入框的上下界：只有 curveValue 加硬边界 —— 游戏侧 BezierParam.AutoSetup 会把它
     * clamp 到 -1~1，这个范围是权威的；并且把当前值一并并进来，免得文件里已有的超范围值
     * 被 antd 在失焦时悄悄改掉。
     * startValue / endValue 不加边界：参考范围只是界面的默认量程，游戏侧对它们不做任何 clamp，
     * 手输的值一旦超出参考范围，量程（和拖拽边界）会跟着放宽
     */
    const boundsFor = (name: string) => {
        if (name !== "curveValue") {
            return {};
        }
        const current = Number(value?.[name]);
        const hasCurrent = Number.isFinite(current);
        return {
            min: hasCurrent ? Math.min(BezierCurveValueRange.min, current) : BezierCurveValueRange.min,
            max: hasCurrent ? Math.max(BezierCurveValueRange.max, current) : BezierCurveValueRange.max,
        };
    };

    /** 步进器步长：按参考范围的跨度取数量级，免得 radius 这种小数值按一下跳 1 */
    const stepForBox = (name: string) => {
        if (name === "curveValue" || !range) {
            return 0.01;
        }
        return stepFor(range.max - range.min);
    };

    // 数值框：标签 + 输入框整组挂 tooltip，悬停标签或框都能看到说明
    const numberBox = (name: string, disabled: boolean) => (
        <Tooltip title={tip(name)} styles={{root: {maxWidth: 380}}}>
            <Space size={4}>
                <Typography.Text type="secondary">{label(name)}</Typography.Text>
                <InputNumber
                    size="small"
                    style={{width: 86}}
                    step={stepForBox(name)}
                    disabled={disabled}
                    value={value?.[name]}
                    {...boundsFor(name)}
                    onChange={(v) => set(name, (v ?? 0) as number)}
                />
            </Space>
        </Tooltip>
    );

    const switchBox = (name: string) => (
        <Tooltip title={tip(name)} styles={{root: {maxWidth: 380}}}>
            <Space size={4}>
                <Typography.Text type="secondary">{label(name)}</Typography.Text>
                <Switch size="small" checked={!!value?.[name]}
                        onChange={(checked) => set(name, checked)}/>
            </Space>
        </Tooltip>
    );

    return (
        <div>
            <Space wrap size={6} align="center">
                {bezierPreview(value)}
                {numberBox("startValue", false)}
                <span style={{color: "#888"}}>→</span>
                {numberBox("endValue", !value?.useEndValue)}
                {switchBox("useEndValue")}
                {/* 游戏侧 CurveValue 要求 useCurveValue 与 useEndValue 同时为真，否则取 0，
                    所以这里两个开关任一关掉都要置灰，不然用户改了个不生效的值 */}
                {numberBox("curveValue", !value?.useEndValue || !value?.useCurveValue)}
                {switchBox("useCurveValue")}
                <Button size="small" onClick={() => setExpanded((prev) => !prev)}>
                    {expanded
                        ? t('ClothParamsEditor.bezier_hide_curve')
                        : t('ClothParamsEditor.bezier_show_curve')}
                </Button>
            </Space>
            {expanded && <BezierParamCurveEditor value={value} onChange={onChange} range={range}/>}
        </div>
    );
};

/** 判断值是否为 BezierParam 形状 */
export function isBezierParam(value: any): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        && "startValue" in value && "useEndValue" in value;
}

export default BezierParamField;
