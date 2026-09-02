import { X, PaperPlaneRightIcon } from "@phosphor-icons/react";

interface ImagePreviewModalProps {
    previewImageUrl: string;
    caption: string;
    onCaptionChange: (value: string) => void;
    onCancel: () => void;
    onConfirmSend: () => void;
}

const ImagePreviewModal = ({
    previewImageUrl,
    caption,
    onCaptionChange,
    onCancel,
    onConfirmSend,
}: ImagePreviewModalProps) => {
    return (
        <div className="absolute inset-0 z-50 bg-[#0c1317]/95 backdrop-blur-sm flex flex-col p-4 justify-between animate-in fade-in">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">Resim Gönder</span>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition"
                >
                    <X size={22} weight="bold" />
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center my-3 overflow-hidden">
                <img
                    src={previewImageUrl}
                    alt="Önizleme"
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
                />
            </div>

            <div className="flex items-center gap-2 bg-[#202c33] rounded-2xl px-4 py-2">
                <input
                    autoFocus
                    type="text"
                    placeholder="Bir açıklama ekleyin..."
                    value={caption}
                    onChange={(e) => onCaptionChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onConfirmSend(); }}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onClick={onConfirmSend}
                    className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white transition flex items-center justify-center"
                >
                    <PaperPlaneRightIcon size={20} weight="fill" />
                </button>
            </div>
        </div>
    );
};

export default ImagePreviewModal;
