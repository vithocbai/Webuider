// src/components/Blocks/ContainerBlock.jsx
import React, { useState } from "react";
import getDefaultProps, { BLOCK_TYPES } from "@/utils/defaultProps";
import RenderBlock from "@/components/RenderBlock";
import { PlusCircle } from "lucide-react";

const ContainerBlock = ({
    block,
    blocks,
    onSelect,
    onChange,
    isPreview,
    onAddBlock,
    selectedBlockId,
    onDeleteBlock, // Nhận thêm prop này
    device, // và prop này
}) => {
    const props = {
        ...getDefaultProps(block.type),
        ...block.props,
    };

    const [openAddMenu, setOpenAddMenu] = useState(false);

    const layoutType = props.layoutType || "block";
    const children = props.children || [];
    
    // ✅ TẠO COMMON PROPS ĐỂ TRUYỀN XUỐNG
    const commonPropsForChildren = {
        blocks, onSelect, onChange, isPreview, selectedBlockId, onAddBlock, onDeleteBlock, device
    };

    // Responsive class cho flexbox
    const layoutClass = layoutType === 'flex' ? 'flex flex-col md:flex-row' : '';

    const layoutStyle = {
        width: props.width || "100%",
        minHeight: props.minHeight || "50px",
        padding: props.padding,
        margin: props.margin,
        backgroundColor: props.backgroundColor,
        border: !isPreview && selectedBlockId === block.id ? "2px dashed #3B82F6" : "1px dashed #ccc",
        position: "relative",
        gap: props.gap,
    };

    // Logic cho Grid (nếu có)
    if (layoutType === 'grid') {
        layoutStyle.display = 'grid';
        layoutStyle.gridTemplateColumns = props.gridTemplateColumns || '1fr';
    }

    return (
        <div
            style={layoutStyle}
            className={layoutClass}
            onClick={(e) => {
                e.stopPropagation();
                if (!isPreview) onSelect(block.id);
            }}
        >
            {children.length > 0 ? (
                children.map((childId) => {
                    const childBlock = blocks?.find((b) => b.id === childId);
                    // ✅ TRUYỀN ĐẦY ĐỦ PROPS XUỐNG RENDERBLOCK
                    return childBlock ? <RenderBlock key={childBlock.id} {...commonPropsForChildren} block={childBlock} /> : null;
                })
            ) : !isPreview ? (
                <div className="text-sm text-gray-400 italic text-center p-4 m-2 border border-dashed rounded-md flex items-center justify-center min-h-[50px]">
                    Empty Container
                </div>
            ) : null}

            {!isPreview && selectedBlockId === block.id && (
                <div className="absolute bottom-2 right-2 z-10">
                    <button
                        className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600"
                        onClick={(e) => { e.stopPropagation(); setOpenAddMenu((p) => !p); }}
                    >
                        <PlusCircle size={24} />
                    </button>
                    {openAddMenu && (
                        <div className="absolute z-20 bg-white border rounded shadow-lg w-48 bottom-full mb-1 right-0">
                           {BLOCK_TYPES.map((type) => (
                                <button key={type} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 capitalize"
                                    onClick={(e) => { e.stopPropagation(); onAddBlock(type, block.id); setOpenAddMenu(false); }}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContainerBlock;