import React, { useEffect, useRef, useState, useCallback } from "react";
import { LayoutTemplate, Package, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Sidebar from "@/components/Sidebar";
import { useParams } from "react-router-dom";
import { useSave } from "@/contexts/SaveContext";
import { toast } from "react-toastify";
import RenderBlock from "@/components/RenderBlock";
import getDefaultProps from "@/utils/defaultProps";
import PropertyPanel from "@/components/PropertyPanel/PropertyPanel";
import { useUndo } from "@/contexts/UndoContext";
import { v4 as uuid } from "uuid";

import { updatePage } from "@/api/pageApi";
import { getPage } from "@/api/pageApi";

function SortableItem({ block, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
}

export default function EditablePage() {
    const [blocks, setBlocks] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const { id } = useParams();
    const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
    const isContainerSelected = selectedBlock?.type === "container";
    const { setSaveFn } = useSave();
    const [expandedBlocks, setExpandedBlocks] = useState({});
    const { recordState, handleUndo, handleRedo, canUndo, canRedo } = useUndo();

    const blocksRef = useRef([]);
    useEffect(() => {
        blocksRef.current = blocks;
    }, [blocks]);

    const [existingPage, setExistingPage] = useState(null);

    // Effect để tải dữ liệu trang khi component mount hoặc ID thay đổi
    useEffect(() => {
        async function fetchPage() {
            try {
                const page = await getPage(id);
                setExistingPage(page);
                const loadedBlocks = page?.content?.blocks || [];
                setBlocks(loadedBlocks);
                blocksRef.current = loadedBlocks;
                recordState(loadedBlocks);
            } catch (err) {
                console.error("Failed to load page:", err);
                toast.error("Failed to load page data.");
            }
        }
        if (id) {
            // Đảm bảo có ID trước khi fetch
            fetchPage();
        }
    }, [id, recordState]); // Thêm recordState vào dependency array

    // Effect để thiết lập hàm lưu cho SaveContext
    useEffect(() => {
        setSaveFn(() => async () => {
            const currentBlocks = blocksRef.current; // Sử dụng ref để đảm bảo lấy trạng thái blocks mới nhất
if (!currentBlocks || currentBlocks.length === 0) {
                toast.warning("No blocks to save. Add some blocks first.");
                return;
            }

            // Lấy ID dự án từ `existingPage` thay vì `localStorage`
            // Điều này đảm bảo rằng `project.id` là cái mà trang này thuộc về
            if (!existingPage || !existingPage.project) {
                toast.error("Page or associated project data not loaded yet. Cannot save.");
                return;
            }

            const payload = {
                title: existingPage.title,
                slug: existingPage.slug,
                content: { blocks: currentBlocks },
                project: existingPage.project, // Sử dụng ID dự án từ dữ liệu trang đã tải
            };

            try {
                await updatePage(id, payload);
                toast.success("Page saved successfully!");

                // Tải lại dữ liệu trang sau khi lưu thành công
                // Điều này đảm bảo giao diện được cập nhật với bất kỳ thay đổi nào từ backend
                const updatedPage = await getPage(id);
                setExistingPage(updatedPage);
            } catch (err) {
                console.error("Save failed:", err.response?.data || err);
                // Hiển thị lỗi cụ thể từ backend nếu có
                const errorMessage = err.response?.data?.project?.[0] || "Error saving to server. Please try again.";
                toast.error(`Save failed: ${errorMessage}`);
            }
        });
    }, [id, setSaveFn, existingPage]); // existingPage là dependency quan trọng

    useEffect(() => {
        if (!id) {
            console.warn("ID is undefined, cannot load page data from localStorage.");
            return;
        }
    }, [id]);

    // Event listener for external update (giữ nguyên nếu bạn dùng cơ chế này)
    useEffect(() => {
        const handleUpdateBlocks = () => {
            const saved = localStorage.getItem("currentBlocks");
            if (saved) {
                const parsed = JSON.parse(saved);
                setBlocks(parsed);
                recordState(parsed);
            }
        };

        window.addEventListener("update-blocks", handleUpdateBlocks);
        return () => window.removeEventListener("update-blocks", handleUpdateBlocks);
    }, [recordState]);

    const addBlock = (type, parentId = null, columnId = null) => {
        const newBlock = {
            id: uuid(),
            type,
            props: getDefaultProps(type),
        };

        setBlocks((prev) => {
            let updatedBlocks = [...prev];

            const blockExists = updatedBlocks.some((b) => b.id === newBlock.id);
            if (!blockExists) {
                updatedBlocks.push(newBlock);
            }

            if (parentId) {
                updatedBlocks = updatedBlocks.map((b) => {
                    if (b.id === parentId && b.type === "container") {
// Đảm bảo children là một mảng
                        const currentChildren = Array.isArray(b.props.children) ? b.props.children : [];
                        if (!currentChildren.includes(newBlock.id)) {
                            return {
                                ...b,
                                props: {
                                    ...b.props,
                                    children: [...currentChildren, newBlock.id],
                                },
                            };
                        }
                    }
                    // Nếu là columns block và có columnId
                    if (b.id === parentId && b.type === "columns" && columnId) {
                        const updatedColumns = b.props.columns.map((col) => {
                            if (col.id === columnId) {
                                const currentColumnChildren = Array.isArray(col.children) ? col.children : [];
                                if (!currentColumnChildren.includes(newBlock.id)) {
                                    return {
                                        ...col,
                                        children: [...currentColumnChildren, newBlock.id],
                                    };
                                }
                            }
                            return col;
                        });
                        return {
                            ...b,
                            props: {
                                ...b.props,
                                columns: updatedColumns,
                            },
                        };
                    }
                    return b;
                });
            }

            recordState(updatedBlocks);
            return updatedBlocks;
        });

        if (!parentId) {
            setSelectedBlockId(newBlock.id);
        } else {
            setSelectedBlockId(newBlock.id);
        }
    };

    const updateBlock = useCallback((updatedBlock) => {
        setBlocks(prev => {
            const newBlocks = prev.map(b => (b.id === updatedBlock.id ? updatedBlock : b));
            recordState(newBlocks); // Ghi lại lịch sử
            return newBlocks;
        });
    }, [recordState]);

    const handleDeleteBlock = (idToDelete) => {
        setBlocks((prev) => {
            let currentBlocks = [...prev];

            const blockToDelete = currentBlocks.find((b) => b.id === idToDelete);
            if (!blockToDelete) return prev;

            currentBlocks = currentBlocks.map((block) => {
                if (block.type === "container" && block.props?.children?.includes(idToDelete)) {
                    return {
                        ...block,
                        props: {
                            ...block.props,
                            children: block.props.children.filter((childId) => childId !== idToDelete),
                        },
                    };
                }
// Xử lý columns
                if (block.type === "columns" && block.props?.columns) {
                    const updatedColumns = block.props.columns.map((col) => {
                        if (col.children?.includes(idToDelete)) {
                            return {
                                ...col,
                                children: col.children.filter((childId) => childId !== idToDelete),
                            };
                        }
                        return col;
                    });
                    return {
                        ...block,
                        props: {
                            ...block.props,
                            columns: updatedColumns,
                        },
                    };
                }
                return block;
            });

            // 3. Xóa block và tất cả con của nó khỏi danh sách blocks tổng thể
            const findAllChildIdsRecursive = (blockId, allBlocks) => {
                const block = allBlocks.find((b) => b.id === blockId);
                if (!block) return [];

                let ids = [blockId];
                if (block.type === "container" && Array.isArray(block.props.children)) {
                    block.props.children.forEach((childId) => {
                        ids = ids.concat(findAllChildIdsRecursive(childId, allBlocks));
                    });
                }
                if (block.type === "columns" && Array.isArray(block.props.columns)) {
                    block.props.columns.forEach((col) => {
                        if (Array.isArray(col.children)) {
                            col.children.forEach((childId) => {
                                ids = ids.concat(findAllChildIdsRecursive(childId, allBlocks));
                            });
                        }
                    });
                }
                return ids;
            };

            const idsToRemove = new Set(findAllChildIdsRecursive(idToDelete, currentBlocks));
            const newBlocks = currentBlocks.filter((b) => !idsToRemove.has(b.id));

            recordState(newBlocks);
            return newBlocks;
        });

        if (selectedBlockId === idToDelete) setSelectedBlockId(null);
    };

    const handleMoveElement = (id, direction) => {
        setBlocks((prev) => {
            let newBlocks = [...prev];

            // Tìm block đang được di chuyển
            const blockToMove = newBlocks.find((b) => b.id === id);
            if (!blockToMove) return prev;

            // Tìm block cha trực tiếp của blockToMove (nếu có)
            let parentBlock = null;
            let parentKey = null;
            let childArray = null;

            // Kiểm tra container children
            parentBlock = newBlocks.find((b) => b.type === "container" && b.props?.children?.includes(id));
            if (parentBlock) {
                parentKey = "children";
childArray = parentBlock.props.children;
            } else {
                // Kiểm tra columns children
                parentBlock = newBlocks.find(
                    (b) => b.type === "columns" && b.props?.columns?.some((col) => col.children?.includes(id))
                );
                if (parentBlock) {
                    parentKey = "columns";
                    // Find the specific column
                    const columnContainingChild = parentBlock.props.columns.find((col) => col.children?.includes(id));
                    if (columnContainingChild) {
                        childArray = columnContainingChild.children;
                    }
                }
            }

            if (parentBlock && childArray) {
                const childIndex = childArray.indexOf(id);
                const newChildIndex = childIndex + direction;

                if (newChildIndex < 0 || newChildIndex >= childArray.length) return prev;

                const updatedChildren = arrayMove(childArray, childIndex, newChildIndex);

                newBlocks = newBlocks.map((b) => {
                    if (b.id === parentBlock.id) {
                        if (parentKey === "children") {
                            return {
                                ...b,
                                props: { ...b.props, children: updatedChildren },
                            };
                        } else if (parentKey === "columns") {
                            const updatedColumns = b.props.columns.map((col) =>
                                col.id === parentBlock.props.columns.find((c) => c.children?.includes(id)).id
                                    ? { ...col, children: updatedChildren }
                                    : col
                            );
                            return {
                                ...b,
                                props: { ...b.props, columns: updatedColumns },
                            };
                        }
                    }
                    return b;
                });
                recordState(newBlocks);
                return newBlocks;
            }

            // Nếu không có block cha, di chuyển ở cấp cao nhất
            const index = newBlocks.findIndex((b) => b.id === id);
            if (index < 0) return prev;

            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= newBlocks.length) return prev;

            const finalBlocks = arrayMove(newBlocks, index, newIndex);
            recordState(finalBlocks);
            return finalBlocks;
        });
    };

    const toggleExpand = (blockId) =>
        setExpandedBlocks((prev) => ({
            ...prev,
            [blockId]: !prev[blockId],
        }));

    const renderTree = (block, level = 0) => {
        if (!block) return null;

        // Tránh render các block đã là con
        const isChildOfOtherBlock = blocks.some(
            (b) =>
(b.type === "container" && b.props?.children?.includes(block.id)) ||
                (b.type === "section" && b.props?.children?.includes(block.id)) ||
                (b.type === "columns" && b.props?.columns?.some((col) => col.children?.includes(block.id)))
        );

        if (isChildOfOtherBlock && level === 0) return null;

        const isExpanded = expandedBlocks[block.id] ?? true;
        const paddingLeft = `${level * 16}px`;

        return (
            <div key={block.id}>
                <div
                    className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition ${
                        selectedBlockId === block.id ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"
                    }`}
                    style={{ paddingLeft: paddingLeft }}
                    onClick={() => setSelectedBlockId(block.id)}
                >
                    <div className="flex items-center gap-1">
                        {block.type === "container" || block.type === "section" ? (
                            <LayoutTemplate size={16} />
                        ) : (
                            <Package size={16} />
                        )}
                        <span className="capitalize">{block.type}</span>
                    </div>
                    {/* Nút mở rộng/thu gọn */}
                    {(block.type === "container" || block.type === "columns" || block.type === "section") && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(block.id);
                            }}
                            className="text-xs text-gray-600 w-4 ml-auto"
                        >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                    )}
                    {/* Nút xóa block */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBlock(block.id);
                        }}
                        className="ml-1 text-red-500 hover:text-red-700"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                {isExpanded && (
                    <>
                        {/* SỬA ĐỔI Ở ĐÂY: Render children của container và section */}
                        {(block.type === "container" || block.type === "section") &&
                            block.props.children &&
                            block.props.children.length > 0 && (
                                <div className="pl-4">
                                    {block.props.children
                                        .map((childId) => blocks.find((b) => b.id === childId))
                                        .filter(Boolean)
.map((child) => renderTree(child, level + 1))}
                                </div>
                            )}
                        {/* Render children của columns */}
                        {block.type === "columns" && block.props.columns && (
                            <div className="pl-4">
                                {block.props.columns.map((column) => (
                                    <div key={column.id}>
                                        <div
                                            className={`flex items-center gap-1 py-1 px-2 text-xs text-gray-600`}
                                            style={{ paddingLeft: `${(level + 1) * 16}px` }}
                                        >
                                            Column {column.id.split("-")[1]}
                                        </div>
                                        {column.children && column.children.length > 0 && (
                                            <div className="pl-4">
                                                {column.children
                                                    .map((childId) => blocks.find((b) => b.id === childId))
                                                    .filter(Boolean)
                                                    .map((child) => renderTree(child, level + 2))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                    </>
                )}
            </div>
        );
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const topLevelBlockIds = blocks
        .filter(
            (b) =>
                !blocks.some(
                    (p) =>
                        (p.type === "container" && p.props?.children?.includes(b.id)) ||
                        (p.type === "section" && p.props?.children?.includes(b.id)) ||
                        (p.type === "columns" && p.props?.columns?.some((col) => col.children?.includes(b.id)))
                )
        )
        .map((b) => b.id);

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar (bên trái) */}
            <Sidebar
                onAddComponent={(type) => addBlock(type)}
                canvasElements={blocks}
                selectedElement={selectedBlock}
                onSelectElement={(el) => setSelectedBlockId(el.id)}
                onMoveElement={handleMoveElement}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
            />
            
            {/* Main Canvas (giữa) */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
onDragEnd={({ active, over }) => {
                    if (!over || active.id === over.id) return;

                    const activeBlock = blocks.find((b) => b.id === active.id);
                    const overBlock = blocks.find((b) => b.id === over.id);

                    // Xác định xem activeBlock và overBlock có phải là con của ColumnsBlock hay Container không
                    const getParentInfo = (blockId) => {
                        for (const b of blocks) {
                            if (b.type === "container" && b.props?.children?.includes(blockId)) {
                                return { parentId: b.id, parentType: "container", childArray: b.props.children };
                            }
                            if (b.type === "columns" && b.props?.columns) {
                                for (const col of b.props.columns) {
                                    if (col.children?.includes(blockId)) {
                                        return {
                                            parentId: b.id,
                                            parentType: "columns",
                                            columnId: col.id,
                                            childArray: col.children,
                                        };
                                    }
                                }
                            }
                        }
                        return null;
                    };

                    const activeParentInfo = getParentInfo(active.id);
                    const overParentInfo = getParentInfo(over.id);

                    setBlocks((prev) => {
                        let currentBlocks = [...prev];

                        if (!activeParentInfo && !overParentInfo) {
                            const activeIndex = topLevelBlockIds.indexOf(active.id);
                            const overIndex = topLevelBlockIds.indexOf(over.id);

                            if (activeIndex !== -1 && overIndex !== -1) {
                                // Lấy các block cấp cao nhất theo thứ tự hiện tại
                                const currentTopLevelBlocks = topLevelBlockIds.map((id) =>
                                    prev.find((b) => b.id === id)
                                );
                                const movedTopLevelBlocks = arrayMove(currentTopLevelBlocks, activeIndex, overIndex);

                                // Tạo một mảng blocks mới bằng cách giữ nguyên các block con và sắp xếp lại các block cấp cao nhất
                                const newBlocksMap = new Map(prev.map((b) => [b.id, b]));

                                // Xóa các block cấp cao nhất cũ khỏi map
                                topLevelBlockIds.forEach((id) => newBlocksMap.delete(id));

                                // Thêm các block cấp cao nhất mới vào map theo thứ tự
                                const finalBlocks = [];
movedTopLevelBlocks.forEach((b) => finalBlocks.push(b));
                                // Thêm lại các block con
                                prev.forEach((b) => {
                                    if (!topLevelBlockIds.includes(b.id)) {
                                        finalBlocks.push(b);
                                    }
                                });
                                recordState(finalBlocks);
                                return finalBlocks;
                            }
                        }
                        // Case 2: Dragging a block from top-level into a container/columns
                        else if (!activeParentInfo && overParentInfo) {
                            // Remove block from top level
                            currentBlocks = currentBlocks.filter((b) => b.id !== active.id);

                            // Add block to target parent's children
                            currentBlocks = currentBlocks.map((b) => {
                                if (b.id === overParentInfo.parentId) {
                                    if (overParentInfo.parentType === "container") {
                                        const newChildren = [...overParentInfo.childArray, active.id];
                                        return { ...b, props: { ...b.props, children: newChildren } };
                                    } else if (overParentInfo.parentType === "columns") {
                                        const updatedColumns = b.props.columns.map((col) => {
                                            if (col.id === overParentInfo.columnId) {
                                                const newChildren = [...col.children, active.id];
                                                return { ...col, children: newChildren };
                                            }
                                            return col;
                                        });
                                        return { ...b, props: { ...b.props, columns: updatedColumns } };
                                    }
                                }
                                return b;
                            });
                            recordState(currentBlocks);
                            return currentBlocks;
                        }
                        // Case 3: Dragging a block from container/columns to top-level
                        else if (activeParentInfo && !overParentInfo) {
                            // Remove block from its parent's children
                            currentBlocks = currentBlocks.map((b) => {
                                if (b.id === activeParentInfo.parentId) {
                                    if (activeParentInfo.parentType === "container") {
                                        const newChildren = activeParentInfo.childArray.filter(
                                            (id) => id !== active.id
);
                                        return { ...b, props: { ...b.props, children: newChildren } };
                                    } else if (activeParentInfo.parentType === "columns") {
                                        const updatedColumns = b.props.columns.map((col) => {
                                            if (col.id === activeParentInfo.columnId) {
                                                const newChildren = col.children.filter((id) => id !== active.id);
                                                return { ...col, children: newChildren };
                                            }
                                            return col;
                                        });
                                        return { ...b, props: { ...b.props, columns: updatedColumns } };
                                    }
                                }
                                return b;
                            });
                            // Add block to top level at over.id's position
                            const overIndexInTopLevel = topLevelBlockIds.indexOf(over.id);
                            if (overIndexInTopLevel !== -1) {
                                const newTopLevelBlocks = topLevelBlockIds.map((id) => prev.find((b) => b.id === id));
                                newTopLevelBlocks.splice(overIndexInTopLevel, 0, activeBlock.id); // Add ID to sorted list

                                // Reconstruct the full blocks array by iterating over the newTopLevelBlocks
                                const finalBlocks = [];
                                const processedIds = new Set();
                                newTopLevelBlocks.forEach((id) => {
                                    const block = currentBlocks.find((b) => b.id === id);
                                    if (block) {
                                        finalBlocks.push(block);
                                        processedIds.add(id);
                                    }
                                });
                                // Add remaining child blocks
                                currentBlocks.forEach((b) => {
                                    if (!processedIds.has(b.id)) {
                                        finalBlocks.push(b);
                                    }
                                });
                                recordState(finalBlocks);
                                return finalBlocks;
                            } else {
                                // If no specific over.id found at top-level, add to end
                                currentBlocks.push(activeBlock);
                                recordState(currentBlocks);
                                return currentBlocks;
                            }
                        }

                        return prev; // Fallback if no specific drag case is handled here
});
                }}
            >
                <SortableContext
                    items={topLevelBlockIds} // Chỉ các block cấp cao nhất
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex-1 overflow-y-auto p-4" style={{ height: "90vh" }}>
                        {topLevelBlockIds.map((blockId) => {
                            const block = blocks.find((b) => b.id === blockId);
                            if (!block) return null; // Should not happen

                            return (
                                <SortableItem key={block.id} block={block}>
                                    <div
                                        className={`relative group mb-2 cursor-pointer rounded border p-2 transition ${
                                            selectedBlockId === block.id
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-transparent hover:border-gray-900"
                                        }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBlockId(block.id);
                                        }}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteBlock(block.id);
                                            }}
                                            className="absolute z-10 top-2 right-2 hidden group-hover:flex items-center justify-center bg-red-500 text-white p-1 rounded hover:bg-red-600"
                                        >
                                            <Trash2 size="18px" />
                                        </button>
                                        <RenderBlock
                                            block={block}
                                            blocks={blocks}
                                            onSelect={(id) => setSelectedBlockId(id)}
                                            onChange={updateBlock}
                                            selectedBlock={selectedBlock}
                                            setBlocks={setBlocks} // Truyền setBlocks của EditablePage
                                            selectedBlockId={selectedBlockId}
                                            onAddBlock={addBlock} // Truyền addBlock của EditablePage
                                            onDeleteBlock={handleDeleteBlock}
                                            isPreview={false} // Luôn là false trên canvas
                                            device="desktop" // Truyền handleDeleteBlock của EditablePage
                                        />
                                    </div>
                                </SortableItem>
);
                        })}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Property Panel & Page Structure (bên phải) */}
            <div className="w-80 max-h-[90vh] overflow-y-auto p-2 border-l flex flex-col gap-4">
                <div className="min-h-[250px] max-h-64 overflow-auto border rounded p-2">
                    <h2 className="text-lg font-semibold mb-2">Page Structure</h2>
                    {topLevelBlockIds.length === 0 ? (
                        <p className="text-gray-500 text-sm px-2">No blocks on page.</p>
                    ) : (
                        topLevelBlockIds.map((id) =>
                            renderTree(
                                blocks.find((b) => b.id === id),
                                0
                            )
                        )
                    )}
                </div>

                <div className="border-t pt-4">
                    <h2 className="text-lg font-semibold mb-2">Properties</h2>
                    {selectedBlock ? (
                        <PropertyPanel block={selectedBlock} onChange={updateBlock} />
                    ) : (
                        <p className="text-gray-500 text-sm">Select an element to edit its properties</p>
                    )}
                </div>
            </div>
        </div>
    );
}