import React, {forwardRef, useMemo, useRef, useState} from "react";
import {Button, Collapse, Descriptions, Flex, Input, theme, Tooltip, Typography} from "antd";
import {DeleteOutlined, HolderOutlined, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import type {DragEndEvent} from "@dnd-kit/react";
import {DragDropProvider} from "@dnd-kit/react";
import {isSortable, useSortable} from "@dnd-kit/react/sortable";
import BaseFormatEditor, {BaseFormatEditorProps, FormatEditorRef} from "./common/BaseFormatEditor";
import {EnumAutoComplete, NullableStringInput, NumberField, Row} from "./parts/formControls";
import BigIntInput from "./common/BigIntInput";
import {arrayMove} from "../utils/utils";
import {ShadowModeNames} from "../utils/kcesEnums";

/** Model.ShadowMode 标签的 i18n key */
const SHADOW_MODE_LABEL_KEYS: Record<string, string> = {
    Default: "ModelEditor.shadow_mode_default",
    CastShadow: "ModelEditor.shadow_mode_cast_shadow",
    NoCastShadow: "ModelEditor.shadow_mode_no_cast_shadow",
};

interface MaterialRowProps {
    id: string;
    index: number;
    value: string;
    dragLabel: string;
    onChange: (index: number, value: string) => void;
    onDelete: (index: number) => void;
}

/** MaterialRow materialFileName 的一行，位置与样式对齐 NeiTableEditor 的行首 */
const MaterialRow: React.FC<MaterialRowProps> = ({id, index, value, dragLabel, onChange, onDelete}) => {
    const {token} = theme.useToken();
    const {ref, handleRef, isDragging} = useSortable({id, index});

    return (
        <div
            ref={ref}
            style={{
                display: "flex",
                gap: 6,
                marginBottom: 6,
                alignItems: "center",
                background: isDragging ? token.controlItemBgActive : undefined,
            }}
        >
            <button
                ref={handleRef}
                type="button"
                title={dragLabel}
                aria-label={dragLabel}
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 4,
                    border: "none",
                    background: "transparent",
                    color: token.colorTextDescription,
                    cursor: "grab",
                }}
            >
                <HolderOutlined/>
            </button>
            <Typography.Text type="secondary" style={{width: 30}}>
                {index}
            </Typography.Text>
            <Input
                size="small"
                value={value ?? ""}
                onChange={(e) => onChange(index, e.target.value)}
            />
            <Button size="small" type="text" danger icon={<DeleteOutlined/>}
                    onClick={() => onDelete(index)}/>
        </div>
    );
};

/**
 * MaterialList materialFileName 列表
 * 行身份由一个与内容解耦的 id 池分配：dnd-kit 要求 id 唯一且稳定，而 materialFileName 的元素
 * 可能重名，不能拿值当身份，下标又会随重排改变。React 的 key 用同一个 id，重排时 id 数组
 * 必须跟着数据一起挪 —— 列表保留着 dnd-kit 默认的乐观排序插件，拖动中它已经挪过 DOM，
 * key 序列若不变，React 就会认为顺序没变、只更新内容，屏幕上的顺序便和数据错开。
 */
const MaterialList: React.FC<{ values: any[]; onChange: (values: string[]) => void }> = ({values, onChange}) => {
    const {t} = useTranslation();
    const seqRef = useRef(0);
    const [ids, setIds] = useState<string[]>([]);
    // 行数变化（新增/删除/换文件）时同步池子长度：保留已有前缀，只给多出来的行发新 id
    const rowIds = useMemo(() => {
        if (ids.length === values.length) return ids;
        const next = ids.slice(0, values.length);
        while (next.length < values.length) {
            next.push(`mat-${seqRef.current++}`);
        }
        return next;
    }, [ids, values.length]);

    const handleChange = (index: number, value: string) => {
        const list = [...values];
        list[index] = value;
        onChange(list);
    };

    const handleDelete = (index: number) => {
        const list = [...values];
        list.splice(index, 1);
        onChange(list);
    };

    /**
     * 乐观排序插件在拖动过程中会把每个 sortable 的 index 更新成元素当前所在的位置，
     * 所以落点取 initialIndex → index（插件内部就是这么算的）；拿 source.index 当起点会错位。
     */
    const handleDragEnd = (event: DragEndEvent) => {
        const source = event.operation.source;
        if (event.canceled || !source || !isSortable(source)) return;
        const from = source.initialIndex;
        const to = source.index;
        if (from === to || from < 0 || from >= values.length || to < 0 || to >= values.length) return;
        onChange(arrayMove(values, from, to));
        // id 要跟着数据一起挪：key 序列不变 React 就不会重排 DOM，而乐观排序已经挪过了
        setIds(arrayMove(rowIds, from, to));
    };

    return (
        <DragDropProvider onDragEnd={handleDragEnd}>
            <div>
                {values.map((name, index) => (
                    <MaterialRow
                        key={rowIds[index]}
                        id={rowIds[index]}
                        index={index}
                        value={name}
                        dragLabel={t('ModelEditor.drag_material')}
                        onChange={handleChange}
                        onDelete={handleDelete}
                    />
                ))}
                <Button size="small" icon={<PlusOutlined/>}
                        onClick={() => onChange([...values, ""])}>
                    {t('ModelEditor.add_material')}
                </Button>
            </div>
        </DragDropProvider>
    );
};

/**
 * KCESModelEditor .model 专用编辑器
 * 样式1：模型元数据 + 材质文件名列表编辑 + 骨骼/变形统计（网格级数据请用 JSON 模式）；样式2：完整 JSON
 */
const KCESModelEditor = forwardRef<FormatEditorRef, Omit<BaseFormatEditorProps, "renderStyle1" | "renderHeader">>(
    (props, ref) => {
        const {t} = useTranslation();

        /** 枚举名 → 对应语言翻译，无翻译时返回 null（选项格式由控件拼装） */
        const labelOf = (keys: Record<string, string>) => (name: string): string | null =>
            t(keys[name] ?? "", {defaultValue: ""}) || null;

        const renderStyle1 = (data: any, setData: (value: any) => void) => {
            const set = (field: string, value: any) => setData({...data, [field]: value});
            const materials: any[] = Array.isArray(data?.materialFileName) ? data.materialFileName : [];

            return (
                <div style={{textAlign: "left", flex: 1, minHeight: 0, overflow: "auto"}}>
                    <Collapse
                        size="small"
                        defaultActiveKey={["meta", "materials"]}
                        items={[
                            {
                                key: "meta",
                                label: t('ModelEditor.metadata'),
                                children: (
                                    <div>
                                        <Row label={t('Common.file_name')}>
                                            <Flex gap="small">
                                                <NullableStringInput value={data?.fileName}
                                                                     onChange={(v) => set("fileName", v)}/>
                                                <Tooltip placement="left" title={t('ModelEditor.file_name_tooltip')}>
                                                    <QuestionCircleOutlined/>
                                                </Tooltip>
                                            </Flex>
                                        </Row>
                                        <Row label={t('ModelEditor.mesh_file_name')}>
                                            <Flex gap="small">
                                                <NullableStringInput value={data?.meshFileName}
                                                                     onChange={(v) => set("meshFileName", v)}/>
                                                <Tooltip  placement="left"  title={t('ModelEditor.mesh_file_name_tooltip')}>
                                                    <QuestionCircleOutlined/>
                                                </Tooltip>
                                            </Flex>
                                        </Row>
                                        <Row label={t('ModelEditor.modelName')}>
                                            <Flex gap="small">
                                            <NullableStringInput value={data?.modelName}
                                                                 onChange={(v) => set("modelName", v)}/>
                                                <Tooltip  placement="left"  title={t('ModelEditor.modelName_tooltip')}>
                                                    <QuestionCircleOutlined/>
                                                </Tooltip>
                                            </Flex>
                                        </Row>
                                        <Row label={t('Common.id')}>
                                            <Flex gap="small">
                                            <BigIntInput value={data?.id} onChange={(v) => set("id", v)}/>
                                                <Tooltip title={t('ModelEditor.id_tooltip')}>
                                                    <QuestionCircleOutlined/>
                                                </Tooltip>
                                            </Flex>
                                        </Row>
                                        <Row label={t('Common.version')}>
                                            <Flex gap="small">
                                            <NumberField precision={0} value={data?.version}
                                                         onChange={(v) => set("version", v)}/>
                                                <Tooltip title={t('Common.version_tooltip')}>
                                                    <QuestionCircleOutlined/>
                                                </Tooltip>
                                            </Flex>
                                        </Row>
                                        <Row label={t('ModelEditor.shadowModeFlags')}>
                                            <Flex gap="small">
                                                <EnumAutoComplete value={data?.shadowModeFlags} names={ShadowModeNames}
                                                                  labelOf={labelOf(SHADOW_MODE_LABEL_KEYS)}
                                                                  onChange={(v) => set("shadowModeFlags", v)}/>
                                                <Tooltip title={t('ModelEditor.shadowModeFlags_tooltip')}>
                                                    <QuestionCircleOutlined/>
                                                </Tooltip>
                                            </Flex>
                                        </Row>
                                    </div>
                                ),
                            },
                            {
                                key: "materials",
                                label: (
                                    <Flex gap="small">
                                        {`${t('ModelEditor.material_file_name')} (${materials.length})`}
                                        <Tooltip title={t('ModelEditor.material_file_name_tooltip')}>
                                            <QuestionCircleOutlined/>
                                        </Tooltip>
                                    </Flex>
                                ),
                                children: (
                                    <MaterialList values={materials}
                                                  onChange={(list) => set("materialFileName", list)}/>
                                ),
                            },
                            {
                                key: "stats",
                                label: t('ModelEditor.data_stats'),
                                children: (
                                    <div>
                                        <Descriptions size="small" column={2} bordered>
                                            <Descriptions.Item label="transData">
                                                {(data?.transData ?? []).length}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="boneNames">
                                                {(data?.boneNames ?? []).length}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="morphs">
                                                {(data?.morphs ?? []).length}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="skinThick">
                                                {data?.skinThick ? "yes" : "null"}
                                            </Descriptions.Item>
                                        </Descriptions>
                                        <Typography.Text type="secondary">
                                            {t('ModelEditor.mesh_data_hint')}
                                        </Typography.Text>
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            );
        };

        return <BaseFormatEditor {...props} ref={ref} renderStyle1={renderStyle1}/>;
    }
);

export default KCESModelEditor;
