import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import { PlusCircle, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import getDefaultProps, { BLOCK_TYPES } from "@/utils/defaultProps";
import getResponsivePropValue from "@/utils/getResponsivePropValue";
import RenderBlock from "@/components/RenderBlock";

function SortableChildItem({ block, commonProps }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 9999 : "auto",
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                w-full
                min-w-0 
                relative group cursor-grab transition 
                ${
                    commonProps.selectedBlockId === block.id
                        ? "border-blue-500 bg-blue-50 border p-2 rounded"
                        : "hover:border-gray-300 border-transparent p-2"
                }
            `}
            onClick={(e) => {
                e.stopPropagation();
                if (!commonProps.isPreview) {
                    commonProps.onSelect(block.id);
                }
            }}
        >
            {!commonProps.isPreview && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        commonProps.onDeleteBlock?.(block.id);
                    }}
                    className="absolute top-2 right-2 z-10 bg-red-500 text-white p-1 rounded hover:bg-red-600"
                >
                    <Trash2 size="16px" />
                </button>
            )}
            <RenderBlock {...commonProps} block={block} />
        </div>
    );
}

export default function ColumnsBlock({
    block,
    blocks,
    onSelect,
    onChange,
    isPreview,
    selectedBlockId,
    setBlocks,
    onAddBlock,
    device,
}) {
    const { columns = [], gap, padding, margin } = block.props;
    const [openColumnMenuId, setOpenColumnMenuId] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const getChildBlocksInColumn = (columnId) => {
        const col = columns.find((c) => c.id === columnId);
        return (col?.children || []).map((id) => blocks.find((b) => b.id === id)).filter(Boolean);
    };

    const handleAddBlockToColumn = (type, columnId) => {
        const newBlockId = uuid();
        const newBlock = {
            id: newBlockId,
            type,
            props: getDefaultProps(type),
        };

        setBlocks((prev) => [...prev, newBlock]);
        const updatedColumns = columns.map((col) =>
            col.id === columnId ? { ...col, children: [...(col.children || []), newBlockId] } : col
        );

        onChange({ ...block, props: { ...block.props, columns: updatedColumns } });
        onSelect(newBlockId);
        setOpenColumnMenuId(null);
    };

    const handleDeleteChildBlock = (childId) => {
        setBlocks((prevBlocks) => {
            const updated = prevBlocks.filter((b) => b.id !== childId);
            const updatedColumns = columns.map((col) => ({
                ...col,
                children: (col.children || []).filter((id) => id !== childId),
            }));
            onChange({ ...block, props: { ...block.props, columns: updatedColumns } });
            return updated;
        });
        if (selectedBlockId === childId) onSelect(null);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setBlocks((prev) => {
            const updatedColumns = columns.map((col) => {
                const ids = [...(col.children || [])];
                if (ids.includes(active.id)) ids.splice(ids.indexOf(active.id), 1);
                return { ...col, children: ids };
            });

            const overCol = columns.find((col) => col.children?.includes(over.id));
            const overColIndex = columns.findIndex((c) => c.id === overCol?.id);
            const activeBlock = prev.find((b) => b.id === active.id);
            if (!overCol || !activeBlock) return prev;

            const insertIndex = overCol.children.indexOf(over.id);
            const newChildren = [...overCol.children];
            newChildren.splice(insertIndex, 0, active.id);

            updatedColumns[overColIndex] = {
                ...overCol,
                children: newChildren,
            };

            onChange({ ...block, props: { ...block.props, columns: updatedColumns } });
            return prev;
        });
    };

    const commonPropsForChildren = {
        blocks,
        onSelect,
        onChange,
        isPreview,
        selectedBlockId,
        setBlocks,
        onAddBlock,
        onDeleteBlock: handleDeleteChildBlock,
        device,
    };

    return (
        // ✅ BƯỚC 1: Chuyển container chính sang FLEXBOX
        <div
            className="columns-block-wrapper relative flex flex-wrap" // Bỏ display:grid, dùng flex
            style={{
                gap: getResponsivePropValue(gap, device) || "16px",
                padding,
                margin,
                border: !isPreview && selectedBlockId === block.id ? "2px dashed #3B82F6" : "2px dashed transparent",
                backgroundColor: isPreview ? "transparent" : "#f9fafb",
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (!isPreview) onSelect(block.id);
            }}
        >
            {columns.map((column) => {
                const responsiveWidth = getResponsivePropValue(column.width, device) || '1fr';
                
                // ✅ BƯỚC 2: Tính toán style cho từng cột trong môi trường Flexbox
                const columnStyle = {
                    minHeight: "100px",
                    minWidth: 0, // Vẫn cần để cho phép co lại
                };

                if (responsiveWidth.includes('fr')) {
                    // Nếu là 'fr', dùng flex-grow để nó tự chia không gian
                    columnStyle.flex = `${parseFloat(responsiveWidth)} 1 0%`; // flex: grow shrink basis
                } else {
                    // Nếu là giá trị cụ thể (px, %), dùng flex-basis
                    columnStyle.flex = `0 0 ${responsiveWidth}`;
                }

                return (
                    <div
                        key={column.id}
                        className={`p-2 flex flex-col ${isPreview ? "" : "border border-dashed border-gray-300"}`}
                        style={columnStyle}
                    >
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext
                                items={getChildBlocksInColumn(column.id).map((b) => b.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {getChildBlocksInColumn(column.id).length > 0 ? (
                                    getChildBlocksInColumn(column.id).map((childBlock) => (
                                        <SortableChildItem
                                            key={childBlock.id}
                                            block={childBlock}
                                            commonProps={commonPropsForChildren}
                                        />
                                    ))
                                ) : !isPreview ? (
                                    <div className="text-center text-gray-400 text-sm py-4 flex-1 flex items-center justify-center">
                                        Drag components here
                                    </div>
                                ) : null}
                            </SortableContext>
                        </DndContext>

                        {!isPreview && (
                            <div className="mt-auto pt-2">
                                <button
                                    className="w-full bg-blue-500 text-white p-1 rounded hover:bg-blue-600 flex items-center justify-center text-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenColumnMenuId(openColumnMenuId === column.id ? null : column.id);
                                    }}
                                >
                                    <PlusCircle size={16} className="mr-1" /> Add Block
                                </button>

                                {openColumnMenuId === column.id && (
                                    <div className="absolute z-20 bg-white border border-gray-300 rounded shadow-lg w-full mt-1 max-h-48 overflow-y-auto">
                                        {BLOCK_TYPES.map((type) => (
                                            <button
                                                key={type}
                                                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 capitalize"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddBlockToColumn(type, column.id);
                                                }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
