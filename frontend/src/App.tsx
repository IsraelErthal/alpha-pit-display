import { FormEvent, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { io } from 'socket.io-client';
import { auth } from './firebase';

type Comment = { id: number; mensagem: string; criadoEm: string; autor: string };
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const videoId = import.meta.env.VITE_YOUTUBE_VIDEO_ID || 'dQw4w9WgXcQ';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [current, setCurrent] = useState(0);

  useEffect(() => auth ? onAuthStateChanged(auth, setUser) : undefined, []);
  useEffect(() => {
    fetch(`${apiUrl}/api/comments`).then(r => r.ok ? r.json() : []).then(setComments).catch(() => setNotice('Não foi possível carregar os comentários agora.'));
    const socket = io(apiUrl);
    socket.on('comment:created', (comment: Comment) => setComments(items => [...items, comment]));
    socket.on('comment:hidden', ({ id }: { id: number }) => setComments(items => items.filter(item => item.id !== id)));
    return () => { socket.disconnect(); };
  }, []);
  useEffect(() => {
    const storageKey = 'alpha-pit-session-id';
    let sessaoId = localStorage.getItem(storageKey);
    if (!sessaoId) { sessaoId = crypto.randomUUID(); localStorage.setItem(storageKey, sessaoId); }
    fetch(`${apiUrl}/api/accesses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessaoId }) }).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!comments.length) return;
    const timer = window.setInterval(() => setCurrent(value => (value + 1) % comments.length), 5200);
    return () => window.clearInterval(timer);
  }, [comments.length]);
  const activeComment = useMemo(() => comments[current % Math.max(comments.length, 1)], [comments, current]);

  async function login() {
    if (!auth) return setNotice('Configure o Firebase no arquivo frontend/.env para habilitar o login.');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch { setNotice('Não foi possível concluir o login com Google.'); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return login();
    const token = await user.getIdToken();
    const response = await fetch(`${apiUrl}/api/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mensagem: message }) });
    if (!response.ok) return setNotice('Não foi possível publicar seu comentário.');
    setMessage(''); setNotice('Comentário enviado. Obrigado por torcer com a Alpha!');
  }
  return <main>
    <header className="topbar"><img src="/assets/Logo Alpha Com Contorno (1).png" alt="Alpha Scuderia" /><div><p>WE ARE THE ONE</p><span>ALPHA SCUDERIA · STEM RACING</span></div><button className="login" onClick={user && auth ? () => signOut(auth) : login}>{user ? 'Sair' : 'Entrar com Google'}</button></header>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">VIDECLIPE INTERATIVO</span><h1>Uma equipe.<br /><em>Uma voz.</em></h1><p>Assista ao clipe e deixe sua mensagem para a Alpha Scuderia.</p><img className="hero-mascot" src="/assets/alpha uniforme 3k v2.png" alt="Alphie, mascote da Alpha Scuderia" /></div>
      <div className="player-wrap"><div className="player"><iframe title="WE ARE THE ONE - Alpha Scuderia" src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />{activeComment && <aside className="bubble"><img src="/assets/mascote---Alphie.png" alt="" /><div><small>TORCIDA ALPHA · {activeComment.autor}</small><strong>{activeComment.mensagem}</strong></div></aside>}</div><p className="player-note">Comentários ao vivo aparecem por aqui ✦</p></div>
    </section>
    <section className="interact"><img src="/assets/alphie animado.png" alt="Alphie animado" /><div><span className="eyebrow">DEIXE SUA MARCA</span><h2>Faça parte desse momento.</h2><form onSubmit={submit}><label htmlFor="comment">Seu comentário <span className="character-count">{message.length}/280</span></label><div className="form-row"><input id="comment" value={message} onChange={e => setMessage(e.target.value)} maxLength={280} placeholder={user ? 'Escreva sua mensagem para a equipe…' : 'Entre com o Google para comentar'} /><button type="submit">Enviar <span>→</span></button></div></form>{notice && <p role="status" className="notice">{notice}</p>}</div><img className="trophy" src="/assets/trofeu-alphie.png" alt="Alphie com troféu" /></section>
    <footer><img src="/assets/Logo Alpha Com Contorno (1).png" alt="Alpha Scuderia" /><p>© 2026 Alpha Scuderia · STEM Racing</p><a href="/admin">Área administrativa</a></footer>
  </main>;
}
