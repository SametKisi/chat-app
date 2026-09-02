import type { RefObject } from "react";
import { PaperPlaneRightIcon, ImageSquare, CircleNotch } from "@phosphor-icons/react";

interface MessageInputBarProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onPickImage: () => void;
    uploadingImage: boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onImageSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MessageInputBar = ({
    value,
    onChange,
    onSend,
    onPickImage,
    uploadingImage,
    fileInputRef,
    onImageSelected,
}: MessageInputBarProps) => {
    return (
        <div className="flex items-center w-full bg-[#325E6A] rounded-full px-3.5 py-1 md:py-2 shrink-0 mb-safe gap-1.5">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onImageSelected}
                className="hidden"
            />
            <button
                type="button"
                onClick={onPickImage}
                disabled={uploadingImage}
                className="p-1 active:scale-90 transition shrink-0 disabled:opacity-40"
            >
                {uploadingImage ? (
                    <CircleNotch size={22} className="text-[#aba9a9] animate-spin" weight="bold" />
                ) : (
                    <ImageSquare
                        size={22}
                        weight="fill"
                        className="text-[#aba9a9] hover:text-amber-400 active:text-amber-500 cursor-pointer transition-colors"
                    />
                )}
            </button>

            <input
                onKeyDown={(e) => { if (e.key === 'Enter') { onSend(); } }}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type="text"
                placeholder="Mesaj yaz..."
                className="flex-1 bg-transparent outline-none text-base md:text-sm text-amber-50 placeholder:text-slate-300 py-1.5"
            />
            <button
                type="button"
                onClick={onSend}
                className="p-1 active:scale-90 transition shrink-0"
            >
                <PaperPlaneRightIcon
                    size={24}
                    weight="fill"
                    className="text-[#aba9a9] hover:text-amber-400 active:text-amber-500 cursor-pointer transition-colors"
                />
            </button>
        </div>
    );
};

export default MessageInputBar;
