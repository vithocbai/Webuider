import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const NavLink = ({ link }) => (
    <li className="list-none">
        <a href={link.href || '#'} className="block px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 md:p-0 md:hover:bg-transparent md:hover:text-blue-600">
            {link.text || 'Link'}
        </a>
    </li>
);

export default function HeaderBlock({ block, isPreview, device }) {
    const props = block.props || {};
    // ✅ THÊM STATE ĐỂ QUẢN LÝ VIỆC ĐÓNG/MỞ MENU
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navLinks = props.navLinks || [];
    
    // ✅ LOGIC ĐƠN GIẢN VÀ CHÍNH XÁC HƠN
    const isMobileLayout = isPreview && (device === 'mobile' || device === 'tablet');

    return (
        <header 
            className="bg-white shadow-sm relative"
            style={{
                backgroundColor: props.backgroundColor,
                color: props.color,
                padding: props.padding || "1rem",
                height: props.height || "auto",
            }}
        >
            <div className="max-w-screen-xl mx-auto flex items-center justify-between">
                
                <div className="flex items-center gap-2">
                    {props.logoSrc && (
                        <img src={props.logoSrc} alt={props.logoAlt || "Logo"} className="h-8 md:h-10" />
                    )}
                    {props.brandName && (
                        <span className="text-xl font-bold">{props.brandName}</span>
                    )}
                </div>

                {isMobileLayout ? (
                    // Giao diện Mobile/Tablet: Nút Hamburger
                    // ✅ GÁN SỰ KIỆN ONCLICK ĐỂ THAY ĐỔI STATE
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu" className="p-2">
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                ) : (
                    // Giao diện Desktop: Menu ngang
                    <nav>
                        <ul className="flex items-center gap-4 lg:gap-6">
                            {navLinks.map((link, index) => <NavLink key={index} link={link} />)}
                        </ul>
                    </nav>
                )}
            </div>

            {/* ✅ MENU XỔ XUỐNG CHO MOBILE/TABLET */}
            {/* Sẽ hiển thị khi isMobileLayout và isMenuOpen cùng là true */}
            {isMobileLayout && isMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-white shadow-lg z-20">
                    <ul className="flex flex-col p-4 space-y-2">
                        {navLinks.map((link, index) => <NavLink key={index} link={link} />)}
                    </ul>
                </div>
            )}
        </header>
    );
}