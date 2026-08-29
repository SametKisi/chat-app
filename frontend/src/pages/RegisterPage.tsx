import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/authClient";

const RegisterPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 1. Kural: Boş alan kontrolü
        if (!formData.fullName || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }

        // 2. Kural: @ işareti kontrolü
        if (!formData.username.startsWith("@")) {
            setError("Kullanıcı adı '@' işareti ile başlamalıdır (Örn: @ahmet).");
            return;
        }

        // 3. Kural: Kullanıcı adı uzunluk kontrolü
        if (formData.username.length < 3) {
            setError("Kullanıcı adı en az 3 karakter olmalıdır.");
            return;
        }

        // 4. Kural: Şifre uzunluk kontrolü
        if (formData.password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        // 5. Kural: Şifre eşleşme kontrolü
        if (formData.password !== formData.confirmPassword) {
            setError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
            return;
        }

        setLoading(true);

        try {
            // Veritabanına kayıt isteği gönderiliyor
            const res = await signUp.email({
                email: formData.email,
                password: formData.password,
                name: formData.fullName,
                username: formData.username,
            } as any);

            setLoading(false);

            if (res.error) {
                setError(res.error.message || "Kayıt sırasında bir hata oluştu.");
                return;
            }

            // Başarılı kayıttan sonra giriş sayfasına yönlendir
            navigate("/Login");
        } catch (err: any) {
            setLoading(false);
            setError(err.message || "Sunucuya bağlanılamadı.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
            <div className="flex flex-col w-full max-w-md h-auto bg-slate-900 border border-slate-800 rounded-xl items-center p-7 gap-6 shadow-2xl">
                <h1 className="font-bold text-gray-300 text-2xl">Kayıt Sayfası</h1>

                {error && (
                    <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col w-full gap-5">
                    <div className="flex flex-1 gap-2.5">
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">
                                Ad soyad
                            </label>
                            <input 
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                type="text" 
                                placeholder="adınız soyadınız" 
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                            />
                        </div>
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">
                                Kullanıcı adınız
                            </label>
                            <input 
                                name="username" 
                                value={formData.username} 
                                onChange={handleChange} 
                                type="text" 
                                placeholder="@example" 
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col w-full gap-1.5">
                        <label className="text-xs font-medium text-slate-300 ml-1">
                            E-posta Adresi
                        </label>
                        <input 
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            type="email" 
                            placeholder="ornek@example.com" 
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                        />
                    </div>

                    <div className="flex flex-1 gap-2.5">
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">
                                Şifre
                            </label>
                            <input 
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                            />
                        </div>
                        <div className="flex flex-col w-full gap-1.5">
                            <label className="text-xs font-medium text-slate-300 ml-1">
                                Şifre tekrar
                            </label>
                            <input 
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="py-3.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25 hover:bg-blue-500 disabled:opacity-50 w-full text-gray-200 text-center cursor-pointer active:scale-[0.98] transition duration-150 font-medium"
                    >
                        {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
                    </button>
                </form>

                <p className="text-xs text-slate-400 text-center">
                    Zaten hesabın var mı?{' '}
                    <Link to="/Login" className="text-blue-400 hover:underline cursor-pointer font-medium">Giriş Yap</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;