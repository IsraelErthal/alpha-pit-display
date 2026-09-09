import { FormEvent, useEffect, useState } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './firebase';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
type Metrics = { acessos: number; usuariosAtivos: number; comentarios: number; usuariosQueComentaram: number };
type Comment = { id: number; mensagem: string; status: string; criado_em: string; usuario: { nome: string; email: string } };
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const defaultEnd = formatDate(new Date());
const defaultStart = formatDate(new Date(Date.now() - 29 * 86_400_000));

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [status, setStatus] = useState('todos');
  const [query, setQuery] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notice, setNotice] = useState('Entre com uma conta administradora para ver os dados.');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => auth ? onAuthStateChanged(auth, setUser) : undefined, []);
  async function authorized(path: string, init: RequestInit = {}) {
    if (!user) throw new Error('Faça login primeiro.');
    const token = await user.getIdToken();
    const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    if (response.status === 403) throw new Error('Sua conta não possui a permissão admin.');
    if (!response.ok) throw new Error('Não foi possível carregar os dados administrativos.');
    return response;
  }
  async function load() {
    try {
      const params = new URLSearchParams({ start, end, status, q: query });
      const [dashboard, list] = await Promise.all([authorized(`/api/admin/dashboard?${params}`), authorized(`/api/admin/comments?${params}`)]);
      setMetrics(await dashboard.json()); setComments(await list.json()); setNotice('');
    } catch (error) { setMetrics(null); setComments([]); setNotice(error instanceof Error ? error.message : 'Erro ao carregar.'); }
  }
  useEffect(() => { if (user) void load(); }, [user]);
  async function login() {
    if (!auth) return setNotice('Firebase não está configurado.');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch { setNotice('Não foi possível concluir o login.'); }
  }
  async function action(path: string, init: RequestInit) { try { await authorized(path, init); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Operação não concluída.'); } }
  async function save(event: FormEvent, id: number) { event.preventDefault(); if (!draft.trim()) return; await action(`/api/admin/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ mensagem: draft }) }); setEditing(null); }
  return <main className="admin-page">
    <header className="admin-header"><a href="/" className="brand">← Alpha Pit Display</a><div>{user ? <><span>{user.email}</span><button onClick={() => signOut(auth!)}>Sair</button></> : <button onClick={login}>Entrar com Google</button>}</div></header>
    <section className="admin-content"><div className="admin-intro"><span className="eyebrow">PAINEL ADMINISTRATIVO</span><h1>Visão da torcida.</h1><p>Indicadores baseados nos acessos e comentários registrados pela aplicação.</p></div>
      <form className="filters" onSubmit={event => { event.preventDefault(); void load(); }}><label>De<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>Até<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todos</option><option value="aprovado">Visíveis</option><option value="oculto">Ocultos</option></select></label><label className="search">Buscar comentário<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Texto ou autor" /></label><button>Aplicar</button></form>
      {notice && <p className="admin-notice">{notice}</p>}
      {metrics && <section className="metric-grid"><Metric label="Acessos" value={metrics.acessos} /><Metric label="Visitantes ativos" value={metrics.usuariosAtivos} /><Metric label="Comentários" value={metrics.comentarios} /><Metric label="Usuários que comentaram" value={metrics.usuariosQueComentaram} /></section>}
      <section className="comment-admin"><div><span className="eyebrow">MODERAÇÃO</span><h2>Comentários</h2></div>{comments.length === 0 && user && !notice && <p>Nenhum comentário neste período.</p>}
        <div className="comment-list">{comments.map(comment => <article className="admin-comment" key={comment.id}><div className="comment-meta"><strong>{comment.usuario.nome}</strong><span>{comment.usuario.email}</span><time>{new Date(comment.criado_em).toLocaleString('pt-BR')}</time><b className={comment.status}>{comment.status}</b></div>{editing === comment.id ? <form onSubmit={event => save(event, comment.id)} className="edit-form"><textarea value={draft} maxLength={280} onChange={e => setDraft(e.target.value)} /><small>{draft.length}/280</small><button>Salvar</button><button type="button" onClick={() => setEditing(null)}>Cancelar</button></form> : <p>{comment.mensagem}</p>}<div className="comment-actions"><button onClick={() => { setEditing(comment.id); setDraft(comment.mensagem); }}>Editar</button>{comment.status === 'oculto' ? <button onClick={() => void action(`/api/admin/comments/${comment.id}/restore`, { method: 'PATCH' })}>Restaurar</button> : <button onClick={() => void action(`/api/admin/comments/${comment.id}/hide`, { method: 'PATCH' })}>Ocultar</button>}<button className="danger" onClick={() => { if (window.confirm('Excluir este comentário permanentemente?')) void action(`/api/admin/comments/${comment.id}`, { method: 'DELETE' }); }}>Excluir</button></div></article>)}</div>
      </section></section>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="metric"><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong></article>; }
