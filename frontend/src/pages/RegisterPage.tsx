import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, User } from "@phosphor-icons/react";
import { signUp } from "../lib/authClient";
import { supabase } from "../../supabaseClient";

const RegisterPage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.fullName || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }

        if (!formData.username.startsWith("@")) {
            setError("Kullanıcı adı '@' işareti ile başlamalıdır (Örn: @ahmet).");
            return;
        }

        if (formData.username.length < 3) {
            setError("Kullanıcı adı en az 3 karakter olmalıdır.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
            return;
        }

        setLoading(true);

        try {
            let uploadedImageUrl = "";

            // 1. Profil Fotoğrafını Supabase Storage'a Yükle
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                const filePath = `profiles/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, imageFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error("Fotoğraf yükleme hatası:", uploadError);
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath);
                    uploadedImageUrl = publicUrlData.publicUrl;
                }
            }

            // 2. Better-Auth ile Kullanıcıyı Oluştur
            const res = await signUp.email({
                email: formData.email,
                password: formData.password,
                name: formData.fullName,
                username: formData.username,
                image: uploadedImageUrl || null,
            } as any);

            if (res.error) {
                setLoading(false);
                setError(res.error.message || "Kayıt sırasında bir hata oluştu.");
                return;
            }

            // 3. user tablosunda image sütununu garanti güncelle
            if (uploadedImageUrl) {
                await supabase
                    .from('user')
                    .update({ image: uploadedImageUrl })
                    .eq('email', formData.email);
            }

            setLoading(false);
            navigate("/Login");
        } catch (err: any) {
            setLoading(false);
            setError(err.message || "Sunucuya bağlanılamadı.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
            <div className="flex flex-col w-full max-w-md h-auto bg-slate-900 border border-slate-800 rounded-2xl items-center p-7 gap-6 shadow-2xl">
                <h1 className="font-bold text-gray-200 text-2xl">Kayıt Ol</h1>

                {error && (
                    <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Profil Fotoğrafı Alanı */}
                <div className="flex flex-col items-center gap-2">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 hover:border-blue-500 cursor-pointer flex items-center justify-center overflow-hidden transition group"
                    >
                        {previewUrl ? (
                            <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={40} className="text-slate-400 group-hover:text-blue-400" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                    />
                    <span className="text-xs text-slate-400">Profil Fotoğrafı Ekle</span>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4">
                    <div className="flex flex-1 gap-2.5">
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">Ad soyad</label>
                            <input 
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                type="text" 
                                placeholder="Ad Soyad" 
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">Kullanıcı adı</label>
                            <input 
                                name="username" 
                                value={formData.username} 
                                onChange={handleChange} 
                                type="text" 
                                placeholder="@kullanici" 
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col w-full gap-1.5">
                        <label className="text-xs font-medium text-slate-300 ml-1">E-posta</label>
                        <input 
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            type="email" 
                            placeholder="ornek@mail.com" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500" 
                        />
                    </div>

                    <div className="flex flex-1 gap-2.5">
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">Şifre</label>
                            <input 
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">Şifre Tekrar</label>
                            <input 
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="py-3.5 mt-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 w-full text-white text-center font-medium transition cursor-pointer"
                    >
                        {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
                    </button>
                </form>

                <p className="text-xs text-slate-400 text-center">
                    Zaten hesabın var mı?{' '}
                    <Link to="/Login" className="text-blue-400 hover:underline font-medium">Giriş Yap</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;