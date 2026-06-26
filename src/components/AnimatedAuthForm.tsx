import { useState, type FormEvent } from "react";
import { User, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AnimatedAuthForm = () => {
  const [isActive, setIsActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: { data: { name }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Conta criada! Verifique seu email para confirmar.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .auth-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #0f172a, #021a4a);
          padding: 20px;
          font-family: "Outfit", sans-serif;
        }

        .auth-container {
          position: relative;
          width: 850px;
          max-width: 100%;
          height: 550px;
          background: #1e293b;
          border-radius: 30px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        .auth-container h1 {
          font-size: 32px;
          margin: -10px 0 10px;
          color: #ffffff;
          font-weight: 600;
        }

        .auth-container p {
          font-size: 14.5px;
          margin: 15px 0;
          color: #94a3b8;
        }

        .auth-form-box {
          position: absolute;
          right: 0;
          width: 50%;
          height: 100%;
          background: #1e293b;
          display: flex;
          align-items: center;
          color: #ffffff;
          text-align: center;
          padding: 40px;
          z-index: 1;
          transition: .6s ease-in-out 1.2s, visibility 0s 1s;
        }

        .auth-container.active .auth-form-box {
          right: 50%;
        }

        .auth-form-box.register {
          visibility: hidden;
        }

        .auth-container.active .auth-form-box.register {
          visibility: visible;
        }

        .auth-form-inner {
          width: 100%;
        }

        .auth-input-box {
          position: relative;
          margin: 20px 0;
        }

        .auth-input-box input {
          width: 100%;
          padding: 13px 50px 13px 20px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          outline: none;
          font-size: 15px;
          color: #ffffff;
          font-weight: 400;
          font-family: "Outfit", sans-serif;
          transition: all 0.3s ease;
        }

        .auth-input-box input:focus {
          border-color: #023A9E;
          box-shadow: 0 0 0 3px rgba(2, 58, 158, 0.2);
        }

        .auth-input-box input::placeholder {
          color: #64748b;
          font-weight: 400;
        }

        .auth-input-box .auth-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .auth-forgot-link {
          margin: -10px 0 20px;
        }

        .auth-forgot-link a {
          font-size: 13px;
          color: #E81C24;
          text-decoration: none;
          transition: color 0.2s;
        }

        .auth-forgot-link a:hover {
          color: #ff3b44;
          text-decoration: underline;
        }

        .auth-btn {
          width: 100%;
          height: 48px;
          background: #E81C24;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(232, 28, 36, 0.3);
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #fff;
          font-weight: 600;
          font-family: "Outfit", sans-serif;
          transition: all 0.2s;
        }

        .auth-btn:hover:not(:disabled) {
          background: #c2131b;
          transform: translateY(-1px);
        }

        .auth-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .auth-toggle-box {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .auth-toggle-box::before {
          content: '';
          position: absolute;
          left: -250%;
          width: 300%;
          height: 100%;
          background: linear-gradient(135deg, #023A9E, #011f56);
          border-radius: 150px;
          z-index: 2;
          transition: 1.8s ease-in-out;
        }

        .auth-container.active .auth-toggle-box::before {
          left: 50%;
        }

        .auth-toggle-panel {
          position: absolute;
          width: 50%;
          height: 100%;
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 2;
          transition: .6s ease-in-out;
          padding: 0 40px;
        }

        .auth-toggle-panel h1 {
          color: #fff;
        }

        .auth-toggle-panel p {
          color: #fff;
          margin-bottom: 20px;
        }

        .auth-toggle-panel.toggle-left {
          left: 0;
          transition-delay: 1.2s;
        }

        .auth-container.active .auth-toggle-panel.toggle-left {
          left: -50%;
          transition-delay: .6s;
        }

        .auth-toggle-panel.toggle-right {
          right: -50%;
          transition-delay: .6s;
        }

        .auth-container.active .auth-toggle-panel.toggle-right {
          right: 0;
          transition-delay: 1.2s;
        }

        .auth-toggle-panel .auth-btn {
          width: 160px;
          height: 46px;
          background: transparent;
          border: 2px solid #fff;
          box-shadow: none;
        }

        @media screen and (max-width: 650px) {
          .auth-container {
            height: calc(100vh - 40px);
          }

          .auth-form-box {
            bottom: 0;
            width: 100%;
            height: 70%;
          }

          .auth-container.active .auth-form-box {
            right: 0;
            bottom: 30%;
          }

          .auth-toggle-box::before {
            left: 0;
            top: -270%;
            width: 100%;
            height: 300%;
            border-radius: 20vw;
          }

          .auth-container.active .auth-toggle-box::before {
            left: 0;
            top: 70%;
          }

          .auth-container.active .auth-toggle-panel.toggle-left {
            left: 0;
            top: -30%;
          }

          .auth-toggle-panel {
            width: 100%;
            height: 30%;
          }

          .auth-toggle-panel.toggle-left {
            top: 0;
          }

          .auth-toggle-panel.toggle-right {
            right: 0;
            bottom: -30%;
          }

          .auth-container.active .auth-toggle-panel.toggle-right {
            bottom: 0;
          }
        }

        @media screen and (max-width: 400px) {
          .auth-form-box {
            padding: 20px;
          }

          .auth-toggle-panel h1 {
            font-size: 30px;
          }
        }
      `}</style>

      <div className="auth-wrapper">
        <div className={`auth-container ${isActive ? "active" : ""}`}>
          {/* Login Form */}
          <div className="auth-form-box login">
            <form className="auth-form-inner" onSubmit={handleLogin}>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center p-2 shadow-lg border border-white/10">
                  <img src={`${import.meta.env.BASE_URL}waspeed-logo.png`} alt="WaSpeed Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <h1>Bem-vindo de volta</h1>
              <p className="mb-6">Acesse seu painel do WaSpeed KB</p>
              <div className="auth-input-box">
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <Mail className="auth-icon" size={20} />
              </div>
              <div className="auth-input-box">
                <input
                  type="password"
                  placeholder="Senha"
                  required
                  minLength={6}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <Lock className="auth-icon" size={20} />
              </div>
              <div className="auth-forgot-link">
                <a href="#">Esqueceu a senha?</a>
              </div>
              <button type="submit" className="auth-btn" disabled={submitting}>
                {submitting ? "Carregando..." : "Login"}
              </button>
            </form>
          </div>

          {/* Register Form */}
          <div className="auth-form-box register">
            <form className="auth-form-inner" onSubmit={handleRegister}>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center p-2 shadow-lg border border-white/10">
                  <img src={`${import.meta.env.BASE_URL}waspeed-logo.png`} alt="WaSpeed Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <h1>Criar Conta</h1>
              <p className="mb-4">Junte-se à nossa plataforma</p>
              <div className="auth-input-box">
                <input
                  type="text"
                  placeholder="Nome"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <User className="auth-icon" size={20} />
              </div>
              <div className="auth-input-box">
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <Mail className="auth-icon" size={20} />
              </div>
              <div className="auth-input-box">
                <input
                  type="password"
                  placeholder="Senha"
                  required
                  minLength={6}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
                <Lock className="auth-icon" size={20} />
              </div>
              <button type="submit" className="auth-btn" disabled={submitting}>
                {submitting ? "Carregando..." : "Cadastrar"}
              </button>
            </form>
          </div>

          {/* Toggle Box */}
          <div className="auth-toggle-box">
            <div className="auth-toggle-panel toggle-left">
              <div className="mb-8 w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 p-3 mx-auto shadow-2xl">
                <img src={`${import.meta.env.BASE_URL}waspeed-logo.png`} alt="WaSpeed Logo" className="w-full h-full object-contain" />
              </div>
              <h1>Olá, visitante!</h1>
              <p>Ainda não possui uma conta no WaSpeed KB?</p>
              <button
                type="button"
                className="auth-btn"
                onClick={() => setIsActive(true)}
              >
                Cadastrar agora
              </button>
            </div>
            <div className="auth-toggle-panel toggle-right">
              <div className="mb-8 w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 p-3 mx-auto shadow-2xl">
                <img src={`${import.meta.env.BASE_URL}waspeed-logo.png`} alt="WaSpeed Logo" className="w-full h-full object-contain" />
              </div>
              <h1>Bem-vindo!</h1>
              <p>Já faz parte do nosso time de gestão?</p>
              <button
                type="button"
                className="auth-btn"
                onClick={() => setIsActive(false)}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnimatedAuthForm;
