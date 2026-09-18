import { FormEvent, useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const tokenKey = 'alpha-pit-admin-token';
type Metrics = { acessos: number; usuariosAtivos: number; comentarios: number; comentariosVisiveis: number };
type Comment = { id: number; mensagem: string; status: string; criado_em: string; autor: string };
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const defaultEnd = formatDate(new Date());
const defaultStart = formatDate(new Date(Date.now() - 29 * 86_400_000));

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(tokenKey));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [status, setStatus] = useState('todos');
  const [query, setQuery] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notice, setNotice] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  function logout() {
    sessionStorage.removeItem(tokenKey);
    setToken(null);
  }

  async function authorized(path: string, init: RequestInit = {}) {
    if (!token) throw new Error('Faça login primeiro.');
    const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    if (response.status === 401) { logout(); throw new Error('Sua sessão expirou. Entre novamente.'); }
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
  useEffect(() => { if (token) void load(); }, [token]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError('');
    try {
      const response = await fetch(`${apiUrl}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha: password }) });
      if (response.status === 429) return setLoginError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      if (!response.ok) return setLoginError('E-mail ou senha inválidos.');
      const { token: newToken } = await response.json();
      sessionStorage.setItem(tokenKey, newToken);
      setToken(newToken);
      setPassword('');
    } catch { setLoginError('Não foi possível concluir o login. Tente novamente.'); }
  }
  async function action(path: string, init: RequestInit) { try { await authorized(path, init); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Operação não concluída.'); } }
  async function save(event: FormEvent, id: number) { event.preventDefault(); if (!draft.trim()) return; await action(`/api/admin/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ mensagem: draft }) }); setEditing(null); }

  if (!token) {
    return (
      <main className="admin-page admin-gate">
        <a href="/" className="brand">← Alpha Pit Display</a>
        <section className="admin-login-box">
          <span className="eyebrow">PAINEL ADMINISTRATIVO</span>
          <h1>Acesso restrito.</h1>
          <p>Entre com seu usuário e senha de administrador.</p>
          <form onSubmit={login}>
            <label htmlFor="admin-email">E-mail</label>
            <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
            <label htmlFor="admin-password">Senha</label>
            <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="submit">Entrar</button>
          </form>
          {loginError && <p className="admin-notice">{loginError}</p>}
        </section>
      </main>
    );
  }

  return <main className="admin-page">
    <header className="admin-header"><a href="/" className="brand">← Alpha Pit Display</a><div><button onClick={logout}>Sair</button></div></header>
    <section className="admin-content"><div className="admin-intro"><span className="eyebrow">PAINEL ADMINISTRATIVO</span><h1>Visão da torcida.</h1><p>Indicadores baseados nos acessos e comentários registrados pela aplicação.</p></div>
      <form className="filters" onSubmit={event => { event.preventDefault(); void load(); }}><label>De<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>Até<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todos</option><option value="pendente">Pendentes</option><option value="aprovado">Visíveis</option><option value="oculto">Ocultos</option></select></label><label className="search">Buscar comentário<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Texto ou autor" /></label><button>Aplicar</button></form>
      {notice && <p className="admin-notice">{notice}</p>}
      {metrics && <section className="metric-grid"><Metric label="Acessos" value={metrics.acessos} /><Metric label="Visitantes ativos" value={metrics.usuariosAtivos} /><Metric label="Comentários" value={metrics.comentarios} /><Metric label="Comentários visíveis" value={metrics.comentariosVisiveis} /></section>}
      <section className="comment-admin"><div><span className="eyebrow">MODERAÇÃO</span><h2>Comentários</h2></div>{comments.length === 0 && !notice && <p>Nenhum comentário neste período.</p>}
        <div className="comment-list">{comments.map(comment => <article className="admin-comment" key={comment.id}><div className="comment-meta"><strong>{comment.autor}</strong><time>{new Date(comment.criado_em).toLocaleString('pt-BR')}</time><b className={comment.status}>{comment.status}</b></div>{editing === comment.id ? <form onSubmit={event => save(event, comment.id)} className="edit-form"><textarea value={draft} maxLength={280} onChange={e => setDraft(e.target.value)} /><small>{draft.length}/280</small><button>Salvar</button><button type="button" onClick={() => setEditing(null)}>Cancelar</button></form> : <p>{comment.mensagem}</p>}<div className="comment-actions"><button onClick={() => { setEditing(comment.id); setDraft(comment.mensagem); }}>Editar</button>{comment.status === 'oculto' ? <button onClick={() => void action(`/api/admin/comments/${comment.id}/restore`, { method: 'PATCH' })}>Restaurar</button> : comment.status === 'pendente' ? <button onClick={() => void action(`/api/admin/comments/${comment.id}/restore`, { method: 'PATCH' })}>Aprovar</button> : <button onClick={() => void action(`/api/admin/comments/${comment.id}/hide`, { method: 'PATCH' })}>Ocultar</button>}<button className="danger" onClick={() => { if (window.confirm('Excluir este comentário permanentemente?')) void action(`/api/admin/comments/${comment.id}`, { method: 'DELETE' }); }}>Excluir</button></div></article>)}</div>
      </section></section>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="metric"><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong></article>; }
