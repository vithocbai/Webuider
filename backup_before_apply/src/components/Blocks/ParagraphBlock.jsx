// import React from "react";
// import getDefaultProps from "@/utils/defaultProps"; // Đảm bảo đường dẫn này đúng

// const ParagraphBlock = ({ block, onSelect }) => {
//     // Kết hợp defaultProps và props từ block
//     const props = {
//         ...getDefaultProps(block.type), // Lấy các props mặc định cho loại block này
//         ...block.props, // Ghi đè bằng các props tùy chỉnh của block hiện tại
//     };

//     // Định nghĩa style chung cho Paragraph
//     const commonStyle = {
//         fontFamily: props.fontFamily || "inherit",
//         fontSize: props.fontSize || "1rem", // Đảm bảo đơn vị px được thêm vào nếu fontSize là số trong textOptions
//         color: props.color || "#000",
//         whiteSpace: 'pre-wrap', // ✅ THÊM DÒNG NÀY ĐỂ XUỐNG DÒNG TỰ ĐỘNG
//         wordBreak: 'break-word', // Thêm dòng này để ngắt từ nếu cần
//         // Ưu tiên props.fontWeight được đặt trực tiếp.
//         // Nếu props.fontWeight không có, thì mới dùng props.bold.
//         fontWeight: props.fontWeight || (props.bold ? "bold" : "normal"),
//         textAlign: props.textAlign || "left",
//         lineHeight: props.lineHeight || "normal",
//         letterSpacing: props.letterSpacing || "normal",
//         fontStyle: props.italic ? "italic" : "normal",
//         textDecoration: props.underline ? "underline" : "none",
//         maxWidth: props.maxWidth || "none", // Mặc định là 'none' nếu không được đặt
//         margin: props.maxWidth && props.textAlign === "center" ? "0 auto" : "initial",
//     };
//     const handleClick = (e) => {
//         if (isPreview) return; // Không làm gì nếu đang ở chế độ preview

//         // 1. Ngăn sự kiện lan ra component cha (Container)
//         e.stopPropagation();
        
//         // 2. Gọi hàm onSelect đã được truyền vào để cập nhật state
//         onSelect(block.id);
//     };
//     return (
//         <p style={commonStyle} onClick={handleClick} className="paragraph-block cursor-pointer">
//             {props.text}
//         </p>
//     );
// };

// export default ParagraphBlock;
// src/components/Blocks/ParagraphBlock.jsx
import React from "react";
import getDefaultProps from "@/utils/defaultProps";
import getResponsivePropValue from "@/utils/getResponsivePropValue";

const ParagraphBlock = ({ block, onSelect, isPreview, device }) => { // ✅ NHẬN THÊM isPreview
    const props = {
        ...getDefaultProps(block.type),
        ...block.props,
    };

    const style = {
        fontFamily: props.fontFamily || "inherit",
        fontSize: getResponsivePropValue(props.fontSize, device) || "1rem",
        color: props.color || "#000",
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontWeight: props.fontWeight || (props.bold ? "bold" : "normal"),
        textAlign: getResponsivePropValue(props.textAlign, device) || "left",
        lineHeight: getResponsivePropValue(props.lineHeight, device) || "normal",
        letterSpacing: getResponsivePropValue(props.letterSpacing, device) || "normal",
        fontStyle: props.italic ? "italic" : "normal",
        textDecoration: props.underline ? "underline" : "none",
        maxWidth: props.maxWidth || "none",
        margin: props.maxWidth && props.textAlign === "center" ? "0 auto" : "initial",
    };


    const handleClick = (e) => {
        if (isPreview) return; // Giờ điều kiện này sẽ hoạt động
        e.stopPropagation();
        onSelect(block.id);
    };
    
    return (
        <p style={style} onClick={handleClick} className="cursor-pointer">
            {props.text || "Default paragraph text."}
        </p>
    );
};

export default ParagraphBlock;