import React, {useRef, useState} from 'react';
import {Button, InputNumber, Space, Table, Tooltip} from 'antd';
import {DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import {useTranslation} from "react-i18next";

/**
 * KeyframeEditorWithTable 关键帧曲线编辑器
 * 移植自 COM3D2_MOD_EDITOR 的同名组件：SVG 可视化（拖拽关键帧/切线、双击添加、画布可调）+ 表格编辑。
 * 原版与 antd Form 耦合，这里改为受控 props（keyframes/onChange），适配 KCES 的受控数据流。
 * 关键帧结构与 KCES DynamicBoneAnimationFrame 一致：time/value/inTangent/outTangent
 */

const KeyframeEditorCanvasSizeKey = "KeyframeEditorCanvasSize"; // 存储画布大小的键

export type Keyframe = {
    time: number;
    value: number;
    inTangent: number;
    outTangent: number;
};

const KeyframeEditorWithTable = ({
                                     keyframes,
                                     onChange,
                                 }: {
    keyframes: Keyframe[];
    onChange: (keyframes: Keyframe[]) => void;
}) => {
    const {t} = useTranslation();
    const [showVisualEditor, setShowVisualEditor] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // 拖拽期间的本地关键帧状态，保证拖拽流畅（mouseup 时才写回父级）
    const [dragKeyframes, setDragKeyframes] = useState<Keyframe[] | null>(null);
    const dragKeyframesRef = useRef<Keyframe[] | null>(null);

    const effective = dragKeyframes ?? keyframes ?? [];

    // 画布大小
    const [dimensions, setDimensions] = useState(() => {
        const saved = localStorage.getItem(KeyframeEditorCanvasSizeKey);
        return saved ? JSON.parse(saved) : {width: 600, height: 300};
    });

    const svgRef = useRef<SVGSVGElement>(null);

    const {width, height} = dimensions; // 画布尺寸
    const pointRadius = 6; // 关键帧点半径
    const handleLength = width * 0.1; // 控制点手柄长度

    // 提交：按时间排序后写回父级
    const commit = (updated: Keyframe[]) => {
        const sorted = [...updated].sort((a, b) => a.time - b.time);
        setDragKeyframes(null);
        dragKeyframesRef.current = null;
        onChange(sorted);
    };

    // 拖拽中间态更新
    const setDragging = (updated: Keyframe[]) => {
        dragKeyframesRef.current = updated;
        setDragKeyframes(updated);
    };

    // 处理画布大小调整
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!svgRef.current) return;

            const svgRect = svgRef.current.getBoundingClientRect();
            const minSize = 100;
            const maxSize = 5000;

            const newWidth = Math.max(minSize, Math.min(moveEvent.clientX - svgRect.left + 12, maxSize));
            const newHeight = Math.max(minSize, Math.min(moveEvent.clientY - svgRect.top + 12, maxSize));

            setDimensions({width: newWidth, height: newHeight});
            localStorage.setItem(KeyframeEditorCanvasSizeKey, JSON.stringify({width: newWidth, height: newHeight}));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // 处理关键帧点开始拖拽
    const handlePointMouseDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setSelectedIndex(index);
        const start = [...effective.map((kf) => ({...kf}))];
        setDragging(start);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!svgRef.current) return;

            const rect = svgRef.current.getBoundingClientRect();
            const rawX = (moveEvent.clientX - rect.left) / dimensions.width;
            const rawY = 1 - (moveEvent.clientY - rect.top) / dimensions.height;
            const x = Math.max(0, Math.min(1, rawX));
            const y = Math.max(0, Math.min(1, rawY));

            const updated = [...(dragKeyframesRef.current ?? start).map((kf) => ({...kf}))];

            // 确保时间值在合理范围内且不会超过相邻关键帧
            if (index > 0 && index < updated.length - 1) {
                updated[index].time = Math.max(updated[index - 1].time, Math.min(updated[index + 1].time, x));
            } else if (index === 0 && updated.length > 1) {
                updated[index].time = Math.min(updated[1].time, x);
            } else if (index === updated.length - 1 && index > 0) {
                updated[index].time = Math.max(updated[index - 1].time, x);
            } else {
                updated[index].time = x;
            }

            updated[index].value = y;
            setDragging(updated);
        };

        const handleMouseUp = () => {
            commit(dragKeyframesRef.current ?? start);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // 处理切线控制点开始拖拽
    const handleTangentMouseDown = (e: React.MouseEvent, index: number, isOutTangent: boolean) => {
        e.stopPropagation();
        setSelectedIndex(index);
        const start = [...effective.map((kf) => ({...kf}))];
        setDragging(start);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!svgRef.current) return;

            const rect = svgRef.current.getBoundingClientRect();
            const updated = [...(dragKeyframesRef.current ?? start).map((kf) => ({...kf}))];
            const keyframe = updated[index];

            const x = keyframe.time * width;
            const y = height - keyframe.value * height;

            const mouseX = moveEvent.clientX - rect.left;
            const mouseY = moveEvent.clientY - rect.top;

            const dx = mouseX - x;
            const dy = mouseY - y;

            // 避免除以零的情况
            if (Math.abs(dx) < 0.001) return;

            const tangentValue = -dy / dx; // 注意 Y 轴是反的

            if (isOutTangent) {
                updated[index].outTangent = tangentValue;
            } else {
                updated[index].inTangent = tangentValue;
            }

            setDragging(updated);
        };

        const handleMouseUp = () => {
            commit(dragKeyframesRef.current ?? start);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // 双击添加新关键帧
    const addKeyframe = (e: React.MouseEvent) => {
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / width;
        const y = 1 - (e.clientY - rect.top) / height;

        const newKeyframe: Keyframe = {time: x, value: y, inTangent: 0, outTangent: 0};
        const all = [...effective, newKeyframe].sort((a, b) => a.time - b.time);
        onChange(all);
        setSelectedIndex(all.findIndex((kf) => kf === newKeyframe));
    };

    // 更新单个关键帧字段（表格输入）
    const updateField = (index: number, field: keyof Keyframe, value: number) => {
        const updated = effective.map((kf, i) => (i === index ? {...kf, [field]: value} : kf));
        onChange(updated);
    };

    // 渲染关键帧曲线
    const renderCurve = () => {
        if (effective.length < 2) return null;

        const sorted = [...effective].sort((a, b) => a.time - b.time);
        const paths: React.ReactNode[] = [];

        for (let i = 0; i < sorted.length - 1; i++) {
            const kf1 = sorted[i];
            const kf2 = sorted[i + 1];

            const x1 = kf1.time * width;
            const y1 = height - kf1.value * height;
            const x2 = kf2.time * width;
            const y2 = height - kf2.value * height;

            const [cp1x, cp1y, cp2x, cp2y] = calculateControlPoints(kf1, kf2, width, height);

            paths.push(
                <path
                    key={i}
                    d={`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#1890ff"
                    strokeWidth="2"
                />
            );
        }

        return paths;
    };

    // 渲染关键帧点和控制点
    const renderKeyframePoints = () => {
        return effective.map((kf: Keyframe, index: number) => {
            const x = kf.time * width;
            const y = height - kf.value * height;
            const isSelected = index === selectedIndex;

            // 计算控制点位置，使用单位向量来保持恒定距离
            const calculateControlPoint = (tangent: number, isOut: boolean) => {
                const magnitude = Math.sqrt(1 + tangent * tangent);
                const dirX = 1 / magnitude * (isOut ? 1 : -1);
                const dirY = tangent / magnitude * (isOut ? -1 : 1);
                return {
                    x: x + dirX * handleLength,
                    y: y + dirY * handleLength
                };
            };

            const outControl = calculateControlPoint(kf.outTangent, true);
            const inControl = calculateControlPoint(kf.inTangent, false);

            return (
                <g key={index}>
                    {isSelected && (
                        <>
                            <line x1={x} y1={y} x2={inControl.x} y2={inControl.y}
                                  stroke="#aaa" strokeWidth="1" strokeDasharray="3,3"/>
                            <line x1={x} y1={y} x2={outControl.x} y2={outControl.y}
                                  stroke="#aaa" strokeWidth="1" strokeDasharray="3,3"/>
                            <circle cx={inControl.x} cy={inControl.y} r={4} fill="#ff7875" stroke="#333"
                                    strokeWidth="1"
                                    onMouseDown={(e) => handleTangentMouseDown(e, index, false)}
                                    style={{cursor: 'pointer'}}/>
                            <circle cx={outControl.x} cy={outControl.y} r={4} fill="#ff7875" stroke="#333"
                                    strokeWidth="1"
                                    onMouseDown={(e) => handleTangentMouseDown(e, index, true)}
                                    style={{cursor: 'pointer'}}/>
                        </>
                    )}

                    <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? pointRadius + 2 : pointRadius}
                        fill={isSelected ? "#52c41a" : "#1890ff"}
                        stroke="#333"
                        strokeWidth="1"
                        onMouseDown={(e) => handlePointMouseDown(e, index)}
                        style={{cursor: 'pointer'}}
                    />
                </g>
            );
        });
    };

    return (
        <>
            <div style={{marginBottom: 8, textAlign: 'left'}}>
                <Space>
                    <Button
                        size="small"
                        icon={showVisualEditor ? <EyeInvisibleOutlined/> : <EyeOutlined/>}
                        onClick={() => setShowVisualEditor(!showVisualEditor)}
                    >
                        {showVisualEditor ? t('KeyFrameEditor.hide_visual_editor') : t('KeyFrameEditor.show_visual_editor')}
                    </Button>
                    <Tooltip title={t('KeyFrameEditor.keyframe_tip')}>
                        <QuestionCircleOutlined/>
                    </Tooltip>
                </Space>
            </div>

            {showVisualEditor && (
                <div style={{textAlign: 'center', marginBottom: 8}}>
                    <svg
                        ref={svgRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                        onDoubleClick={addKeyframe}
                        style={{cursor: 'crosshair', background: 'rgba(128,128,128,0.06)', borderRadius: 6}}
                    >
                        {/* 绘制网格 */}
                        <g>
                            {Array.from({length: 11}).map((_, i) => (
                                <line key={`h-${i}`} x1="0" y1={i * height / 10} x2={width} y2={i * height / 10}
                                      stroke="rgba(128,128,128,0.18)" strokeWidth="1"/>
                            ))}
                            {Array.from({length: 11}).map((_, i) => (
                                <line key={`v-${i}`} x1={i * width / 10} y1="0" x2={i * width / 10} y2={height}
                                      stroke="rgba(128,128,128,0.18)" strokeWidth="1"/>
                            ))}
                        </g>

                        {/* 坐标轴刻度 */}
                        <g style={{userSelect: 'none', pointerEvents: 'none'}}>
                            {Array.from({length: 11}).map((_, i) => {
                                const xPos = width * i / 10;
                                return (
                                    <text key={`time-label-${i}`}
                                          x={i === 0 ? xPos + 2 : i === 10 ? xPos - 12 : xPos}
                                          y={height - 4}
                                          fill="#888" fontSize="10"
                                          textAnchor={i === 0 ? 'start' : i === 10 ? 'end' : 'middle'}>
                                        {i / 10}
                                    </text>
                                );
                            })}
                            {Array.from({length: 11}).map((_, i) => {
                                const yPos = height - height * i / 10;
                                return (
                                    <text key={`value-label-${i}`}
                                          x={8}
                                          y={i === 0 ? yPos - 2 : i === 10 ? yPos + 2 : yPos + 3}
                                          fill="#888" fontSize="10" textAnchor="start"
                                          dominantBaseline={i === 10 ? 'text-before-edge' : 'auto'}>
                                        {i / 10}
                                    </text>
                                );
                            })}
                        </g>

                        {renderCurve()}
                        {renderKeyframePoints()}

                        {/* 调整画布大小手柄 */}
                        <rect
                            x={dimensions.width - 10}
                            y={dimensions.height - 10}
                            width={8}
                            height={8}
                            fill="#fff"
                            stroke="#333"
                            strokeWidth="1"
                            onMouseDown={handleResizeMouseDown}
                            style={{cursor: 'se-resize'}}
                        />
                    </svg>

                    <div style={{
                        padding: 4,
                        fontSize: 12,
                        color: '#888',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <span>{t('KeyFrameEditor.visual_editor_tip')}</span>
                        <Space.Compact>
                            <Space.Addon>{t('KeyFrameEditor.width')}</Space.Addon>
                            <InputNumber
                                size="small"
                                style={{width: 90}}
                                value={dimensions.width}
                                onChange={(value) => {
                                    const newWidth = Number(value) || 600;
                                    setDimensions((prev: any) => ({...prev, width: newWidth}));
                                    localStorage.setItem(KeyframeEditorCanvasSizeKey,
                                        JSON.stringify({...dimensions, width: newWidth}));
                                }}
                            />
                        </Space.Compact>
                        <Space.Compact>
                            <Space.Addon>{t('KeyFrameEditor.height')}</Space.Addon>
                            <InputNumber
                                size="small"
                                style={{width: 90}}
                                value={dimensions.height}
                                onChange={(value) => {
                                    const newHeight = Number(value) || 300;
                                    setDimensions((prev: any) => ({...prev, height: newHeight}));
                                    localStorage.setItem(KeyframeEditorCanvasSizeKey,
                                        JSON.stringify({...dimensions, height: newHeight}));
                                }}
                            />
                        </Space.Compact>
                    </div>
                </div>
            )}

            {/* 表格编辑器 */}
            <Table
                dataSource={effective.map((kf, index) => ({...kf, __index: index}))}
                rowKey="__index"
                size="small"
                bordered
                pagination={false}
                footer={() => (
                    <Button
                        size="small"
                        style={{width: '100%'}}
                        onClick={() => {
                            const maxTime = effective.length > 0
                                ? Math.max(...effective.map((kf) => kf.time)) : 0;
                            onChange([...effective, {
                                time: Math.min(maxTime + 0.1, 1),
                                value: 0,
                                inTangent: 0,
                                outTangent: 0
                            }]);
                        }}
                    >
                        {t('KeyFrameEditor.add_keyframe')}
                    </Button>
                )}
                columns={[
                    {
                        title: t('KeyFrameEditor.Time'),
                        width: 100,
                        render: (_, record: any) => (
                            <InputNumber
                                size="small" style={{width: '100%'}} min={0} max={1} step={0.01}
                                value={record.time}
                                onChange={(value) => updateField(record.__index, 'time', (value ?? 0) as number)}
                            />
                        ),
                    },
                    {
                        title: t('KeyFrameEditor.Value'),
                        width: 100,
                        render: (_, record: any) => (
                            <InputNumber
                                size="small" style={{width: '100%'}} step={0.01}
                                value={record.value}
                                onChange={(value) => updateField(record.__index, 'value', (value ?? 0) as number)}
                            />
                        ),
                    },
                    {
                        title: t('KeyFrameEditor.InTangent'),
                        width: 100,
                        render: (_, record: any) => (
                            <InputNumber
                                size="small" style={{width: '100%'}} step={0.01}
                                value={record.inTangent}
                                onChange={(value) => updateField(record.__index, 'inTangent', (value ?? 0) as number)}
                            />
                        ),
                    },
                    {
                        title: t('KeyFrameEditor.OutTangent'),
                        width: 100,
                        render: (_, record: any) => (
                            <InputNumber
                                size="small" style={{width: '100%'}} step={0.01}
                                value={record.outTangent}
                                onChange={(value) => updateField(record.__index, 'outTangent', (value ?? 0) as number)}
                            />
                        ),
                    },
                    {
                        title: t('Common.operate'),
                        width: 60,
                        render: (_, record: any) => (
                            <Button
                                size="small"
                                icon={<DeleteOutlined/>}
                                onClick={() => {
                                    const updated = [...effective];
                                    updated.splice(record.__index, 1);
                                    onChange(updated);
                                }}
                            />
                        ),
                    },
                ]}
            />
        </>
    );
};

// 辅助函数：计算贝塞尔曲线控制点
const calculateControlPoints = (kf1: Keyframe, kf2: Keyframe, width: number, height: number): [number, number, number, number] => {
    const x1 = kf1.time * width;
    const x2 = kf2.time * width;

    const y1 = height - kf1.value * height;
    const y2 = height - kf2.value * height;

    const dx = x2 - x1;

    const cp1x = x1 + dx / 3;
    const cp1y = y1 - kf1.outTangent * dx / 3;

    const cp2x = x2 - dx / 3;
    const cp2y = y2 + kf2.inTangent * dx / 3;

    return [cp1x, cp1y, cp2x, cp2y];
};

export default KeyframeEditorWithTable;
