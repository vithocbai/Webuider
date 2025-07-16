import React, { useState, useEffect } from "react";
import { getPagesByProject } from "@/api/pageApi"; // API để lấy danh sách trang
import { v4 as uuid } from 'uuid'; // Để tạo ID cho link mới
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

// Component con để render mỗi link trong danh sách, có thể kéo thả
function SortableNavLinkItem({ link, index, onUpdate, onRemove, onSelectPage }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="border p-2 rounded mb-2 space-y-2 bg-white">
            <div className="flex items-center gap-2">
                <span {...attributes} {...listeners} className="cursor-grab text-gray-400"><GripVertical size={20} /></span>
                <input
                    type="text"
                    value={link.text}
                    onChange={(e) => onUpdate(index, "text", e.target.value)}
                    placeholder="Link Text"
                    className="border rounded px-2 py-1 text-sm flex-grow"
                />
                <button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={16}/>
                </button>
            </div>
            <div className="flex items-center gap-2 pl-8">
               <input
                    type="text"
                    value={link.href}
                    onChange={(e) => onUpdate(index, "href", e.target.value)}
                    placeholder="URL (e.g., /about)"
                    className="border rounded px-2 py-1 text-sm flex-grow"
                />
                <button 
                    type="button" 
                    onClick={() => onSelectPage(index)}
                    className="text-xs text-blue-600 p-1 bg-blue-50 rounded hover:bg-blue-100"
                >
                    Page
                </button>
            </div>
        </div>
    );
}

const HeaderOptions = ({ block, onChange }) => {
    const [projectPages, setProjectPages] = useState([]);
    const [showPageSelector, setShowPageSelector] = useState(-1); // index của link đang được chọn

    useEffect(() => {
        const currentProject = JSON.parse(localStorage.getItem("currentProject"));
        if (currentProject?.id) {
            getPagesByProject(currentProject.id)
                .then(pages => setProjectPages(pages))
                .catch(err => console.error("Failed to fetch project pages", err));
        }
    }, []);

    // Hàm cập nhật prop đơn giản
    const handlePropChange = (key, value) => {
        onChange({ ...block, props: { ...block.props, [key]: value } });
    };

    // Hàm cập nhật thuộc tính của một navLink
    const handleNavLinkChange = (index, key, value) => {
        const updatedLinks = [...(block.props.navLinks || [])];
        updatedLinks[index] = { ...updatedLinks[index], [key]: value };
        onChange({ ...block, props: { ...block.props, navLinks: updatedLinks } });
    };

    // Hàm liên kết đến một trang có sẵn
    const handleLinkToPage = (navIndex, pageId) => {
        handleNavLinkChange(navIndex, "href", `page://${pageId}`);
        setShowPageSelector(-1);
    };

    const addNavLink = () => {
        const newLink = { id: uuid(), text: "New Link", href: "#" };
        const updatedLinks = [...(block.props.navLinks || []), newLink];
        handlePropChange("navLinks", updatedLinks);
    };

    const removeNavLink = (index) => {
        const updatedLinks = (block.props.navLinks || []).filter((_, i) => i !== index);
        handlePropChange("navLinks", updatedLinks);
    };

    // Xử lý kéo thả NavLink
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = block.props.navLinks.findIndex(link => link.id === active.id);
            const newIndex = block.props.navLinks.findIndex(link => link.id === over.id);
            const updatedLinks = arrayMove(block.props.navLinks, oldIndex, newIndex);
            handlePropChange("navLinks", updatedLinks);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-md font-semibold">Header Settings</h3>
            {/* General Settings */}
            <div>
                <label className="block text-sm font-medium">Brand Name</label>
                <input type="text" value={block.props.brandName || ""} onChange={(e) => handlePropChange("brandName", e.target.value)} className="w-full border rounded px-2 py-1 mt-1" />
            </div>
            <div>
                <label className="block text-sm font-medium">Logo URL</label>
                <input type="text" value={block.props.logoSrc || ""} onChange={(e) => handlePropChange("logoSrc", e.target.value)} className="w-full border rounded px-2 py-1 mt-1" />
            </div>
             <div className="flex items-center justify-between">
                <label className="text-sm">Fixed Header</label>
                <input type="checkbox" checked={!!block.props.isFixed} onChange={(e) => handlePropChange("isFixed", e.target.checked)} />
            </div>

            <hr/>

            {/* Navigation Links */}
            <div>
                <label className="block text-sm font-medium mb-2">Navigation Links</label>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={block.props.navLinks?.map(link => link.id) || []} strategy={verticalListSortingStrategy}>
                        {(block.props.navLinks || []).map((link, index) => (
                           <div key={link.id} className="relative">
                                <SortableNavLinkItem
                                    link={link}
                                    index={index}
                                    onUpdate={handleNavLinkChange}
                                    onRemove={removeNavLink}
                                    onSelectPage={() => setShowPageSelector(showPageSelector === index ? -1 : index)}
                                />
                                {showPageSelector === index && (
                                    <div className="absolute top-full right-0 mt-1 w-48 bg-white border shadow-lg z-20 rounded-md">
                                        {projectPages.length > 0 ? (
                                            projectPages.map(page => (
                                                <button 
                                                    key={page.id} 
                                                    onClick={() => handleLinkToPage(index, page.id)}
                                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                                >
                                                    {page.title}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-gray-500">No pages found.</div>
                                        )}
                                    </div>
                                )}
                           </div>
                        ))}
                    </SortableContext>
                </DndContext>
                <button type="button" onClick={addNavLink} className="mt-2 text-sm text-blue-600 hover:underline">+ Add Navigation Link</button>
            </div>

            <hr/>
            {/* Style Settings */}
             <div>
                <label className="block text-sm font-medium">Background Color</label>
                <input type="color" value={block.props.backgroundColor || "#FFFFFF"} onChange={(e) => handlePropChange("backgroundColor", e.target.value)} className="w-full h-8 border rounded" />
            </div>
             <div>
                <label className="block text-sm font-medium">Padding</label>
                <input type="text" value={block.props.padding || "1rem"} onChange={(e) => handlePropChange("padding", e.target.value)} className="w-full border rounded px-2 py-1 mt-1" placeholder="e.g., 1rem or 10px 20px"/>
            </div>
        </div>
    );
};

export default HeaderOptions;