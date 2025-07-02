// import React, { useState } from "react";
// import { X } from "lucide-react";
// import "react-quill/dist/quill.snow.css";
// import ReactQuill from "react-quill";
// import { ChevronDown } from "lucide-react";

// const CreatePostModal = ({ onClose }) => {
//     const [content, setContent] = useState("");
//     const [selectedPage, setSelectedPage] = useState("");

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//             <div className="bg-white w-full max-w-[70%] rounded-lg shadow-lg p-6 relative">
//                 {/* Close Button */}
//                 <button className="absolute top-4 right-4 text-gray-500 hover:text-black" onClick={onClose}>
//                     <X />
//                 </button>

//                 <h2 className="text-xl font-semibold mb-6">Create New Post</h2>

//                 <form className="space-y-4">
//                     <div>
//                         <label className="block font-medium mb-1">Title</label>
//                         <input type="text" placeholder="Post title" className="w-full border rounded-md px-3 py-2" />
//                     </div>

//                     <div>
//                         <label className="block font-medium mb-1">Excerpt</label>
//                         <input
//                             type="text"
//                             placeholder="Brief description of your post"
//                             className="w-full border rounded-md px-3 py-2"
//                         />
//                     </div>

//                     <div>
//                         <label className="block font-medium mb-1">Page</label>
//                         <div className="relative">
//                             <select
//                                 value={selectedPage}
//                                 onChange={(e) => setSelectedPage(e.target.value)}
//                                 className="w-full border rounded-md px-3 py-2 appearance-none pr-10"
//                             >
//                                 <option value="">-- Select target page --</option>
//                                 <option value="home">Homepage</option>
//                                 <option value="blog">Blog</option>
//                                 <option value="news">News</option>
//                                 <option value="tutorials">Tutorials</option>
//                             </select>

//                             {/* Custom dropdown icon */}
//                             <ChevronDown
//                                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
//                                 size={18}
//                             />
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-4">
//                         <div>
//                             <label className="block font-medium mb-1">Category</label>
//                             <input
//                                 type="text"
//                                 placeholder="e.g. Technology"
//                                 className="w-full border rounded-md px-3 py-2"
//                             />
//                         </div>
//                         <div>
//                             <label className="block font-medium mb-1">Featured Image URL</label>
//                             <input
//                                 type="text"
//                                 placeholder="https://example.com/image.jpg"
//                                 className="w-full border rounded-md px-3 py-2"
//                             />
//                         </div>
//                     </div>

//                     <div>
//                         <label className="block font-medium mb-1">Tags</label>
//                         <div className="flex items-center gap-2">
//                             <input
//                                 type="text"
//                                 placeholder="Add tag..."
//                                 className="flex-1 border rounded-md px-3 py-2"
//                             />
//                             <button type="button" className="bg-gray-200 px-4 py-2 rounded-md">
//                                 Add
//                             </button>
//                         </div>
//                     </div>

//                     <div>
//                         <label className="block font-medium mb-1">Content</label>
//                         <ReactQuill
//                             theme="snow"
//                             value={content}
//                             onChange={setContent}
//                             placeholder="Write your post content here..."
//                             className="bg-white "
//                         />
//                     </div>

//                     <div className="flex justify-end gap-2 mt-4">
//                         <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">
//                             Cancel
//                         </button>
//                         <button type="submit" className="px-4 py-2 bg-black text-white rounded-md">
//                             Create
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default CreatePostModal;

// CreatePostModal.jsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createPost, updatePost } from "@/api/postApi"; // Import các hàm API
import { toast } from "react-toastify"; // Để hiển thị thông báo

// Component này nhận currentProjectId, onPostCreated, onPostUpdated, và postToEdit
const CreatePostModal = ({ onClose, currentProjectId, onPostCreated, onPostUpdated, postToEdit }) => {
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState({}); // Giả định content là một đối tượng JSON
    const [category, setCategory] = useState(""); // Thêm state cho category
    const [tags, setTags] = useState(""); // Thêm state cho tags (dạng chuỗi, sẽ parse thành mảng)
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Sử dụng useEffect để điền dữ liệu vào form nếu đang chỉnh sửa bài viết
    useEffect(() => {
        if (postToEdit) {
            setTitle(postToEdit.title);
            setSlug(postToEdit.slug);
            setContent(postToEdit.content || {});
            setCategory(postToEdit.category || "");
            setTags(postToEdit.tags ? postToEdit.tags.join(", ") : "");
        } else {
            // Reset form khi tạo mới
            setTitle("");
            setSlug("");
            setContent({});
            setCategory("");
            setTags("");
        }
    }, [postToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!currentProjectId) {
            setError("Không có dự án được chọn.");
            setIsLoading(false);
            return;
        }

        const parsedTags = tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== "");

        const postData = {
            title,
            slug,
            content,
            category, // Thêm category
            tags: parsedTags, // Thêm tags
            project: currentProjectId, // Đảm bảo tên trường khớp với backend (project hoặc project_id)
        };

        try {
            let response;
            if (postToEdit) {
                // Nếu đang chỉnh sửa
                response = await updatePost(postToEdit.id, postData);
                onPostUpdated(response); // Gọi callback để cập nhật state trong PostManager
                toast.success("Cập nhật bài viết thành công!");
            } else {
                // Nếu đang tạo mới
                response = await createPost(currentProjectId, postData); // createPost có projectId là tham số đầu tiên
                onPostCreated(response); // Gọi callback để thêm vào state trong PostManager
                toast.success("Tạo bài viết thành công!");
            }
            onClose(); // Đóng modal sau khi thành công
        } catch (err) {
            console.error("Lỗi khi gửi bài viết:", err);
            const errorMessage = err.response?.data?.message || err.message || "Đã xảy ra lỗi.";
            setError(errorMessage);
            toast.error(`Thất bại: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-lg p-6 relative">
                <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={onClose}>
                    <X />
                </button>
                <h2 className="text-2xl font-bold mb-4">{postToEdit ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Tiêu đề
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                            Slug (URL Friendly)
                        </label>
                        <input
                            type="text"
                            id="slug"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Danh mục
                        </label>
                        <input
                            type="text"
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                            Tags (phân cách bởi dấu phẩy)
                        </label>
                        <input
                            type="text"
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                            Nội dung (JSON)
                        </label>
                        <textarea
                            id="content"
                            value={JSON.stringify(content, null, 2)} // Hiển thị JSON đẹp
                            onChange={(e) => {
                                try {
                                    setContent(JSON.parse(e.target.value));
                                } catch (err) {
                                    // Xử lý lỗi parse JSON nếu người dùng nhập sai
                                    console.warn("Invalid JSON content:", err);
                                }
                            }}
                            rows="5"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">Nhập nội dung bài viết dưới dạng JSON.</p>
                    </div>

                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Đang xử lý..." : postToEdit ? "Cập nhật" : "Tạo bài viết"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePostModal;
