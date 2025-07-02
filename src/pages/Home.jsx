// src/pages/Home.jsx
import Sidebar from "@/components/Sidebar";
import React, { useEffect, useState } from "react";
import { Folder, FileText, Newspaper, ChevronRight } from "lucide-react";
import { getProjects } from "@/api/projectApi";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

export default function Home() {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const projectsData = await getProjects();
                setProjects(projectsData);
                console.log("Projects data loaded:", projectsData);
            } catch (err) {
                console.error("Lỗi khi tải dự án:", err);
                const errorMessage = err.response?.data?.detail || err.message || "Không thể tải dự án.";
                setError(`Lỗi: ${errorMessage}`);
                toast.error(`Không thể tải dự án: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const handleProjectSelect = (projectId) => {
        setSelectedProjectId(projectId);
        console.log(`Project ${projectId} selected.`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 p-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3 border-b pb-4">
                        <Folder className="w-8 h-8 text-indigo-600" />
                        Quản lý Dự án
                    </h2>

                    {isLoading && (
                        <div className="text-center py-12 text-gray-500 text-lg">Đang tải danh sách dự án...</div>
                    )}

                    {error && <div className="text-center py-12 text-red-500 text-lg font-medium">{error}</div>}

                    {!isLoading && !error && (
                        <>
                            {projects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                                        >
                                            <Link to={`/projects/${project.id}`} className="block h-full">
                                                {" "}
                                                {/* Ví dụ đường dẫn chi tiết project */}
                                                <div className="p-6 flex flex-col flex-grow">
                                                    <div className="flex items-center mb-3">
                                                        <Folder className="w-6 h-6 text-indigo-500 mr-3" />
                                                        <h3 className="text-xl font-bold text-gray-900 truncate">
                                                            {project.name}
                                                        </h3>
                                                    </div>
                                                    {project.description && (
                                                        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
                                                            {project.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                                                        {project.created_at && (
                                                            <span>
                                                                Ngày tạo:{" "}
                                                                {new Date(project.created_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        <ChevronRight className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center mt-10 text-lg">Chưa có dự án nào được tạo.</p>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
