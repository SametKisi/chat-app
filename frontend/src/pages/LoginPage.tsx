import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../lib/authClient";

const LoginPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.email || !formData.password) {
            setError("Lütfen e-posta ve şifrenizi girin.");
            return;
        }

        setLoading(true);

        try {
            const res = await signIn.email({
                email: formData.email,
                password: formData.password,
            });

            setLoading(false);

            if (res.error) {
                setError(res.error.message || "E-posta veya şifre hatalı.");
                return;
            }

            // Başarılı girişte ana sayfaya (veya mesajlaşma paneline) yönlendir
            navigate("/");
        } catch (err: any) {
            setLoading(false);
            setError(err.message || "Sunucuya bağlanırken bir hata oluştu.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
            <div className="flex flex-col w-full max-w-md h-auto bg-slate-900 border border-slate-800 rounded-xl items-center p-7 gap-5 shadow-2xl">
                <h1 className="font-bold text-gray-300 text-2xl">Giriş Sayfası</h1>

                {error && (
                    <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4">
                    <div className="flex flex-col w-full gap-1.5">
                        <label className="text-xs font-medium text-slate-300 ml-1">
                            E-posta Adresi
                        </label>
                        <input 
                            name="email"
                            type="email" 
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="E-posta" 
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                        />
                    </div>
                    <div className="flex flex-col w-full gap-1.5">
                        <label className="text-xs font-medium text-slate-300 ml-1">
                            Şifre
                        </label>
                        <input 
                            name="password"
                            type="password" 
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••" 
                            className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition duration-150" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="py-3.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25 hover:bg-blue-500 disabled:opacity-50 w-full text-gray-200 text-center cursor-pointer active:scale-[0.98] transition duration-150 font-medium"
                    >
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>

                <p className="text-xs text-slate-400 text-center">
                    Hesabın yok mu?{' '}
                    <Link to="/register" className="text-blue-400 hover:underline cursor-pointer font-medium">Kayıt Ol</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;