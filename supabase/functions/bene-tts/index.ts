// Gera os áudios da Bené UMA vez no ElevenLabs e guarda no Storage (bucket bene-audio/v1).
// A lista de frases é fixa aqui dentro: quem chamar a função só consegue gerar o que falta desta lista.
import { createClient } from "npm:@supabase/supabase-js@2";
const VOICE = "CstacWqMhJQlnfLPxRG4";
const MODEL = "eleven_multilingual_v2";
const BUCKET = "bene-audio";
const DIR = "v1";
const P: Record<string, string> = {
 "A_story": "A de Arca! Deus pediu para Noé construir uma arca bem grande, e os bichinhos entraram nela. Toque na letra A para ouvir o som.",
 "A_g1": "Ajude os amigos a entrar na arca! Toque só nas figuras que começam com o som A.",
 "A_g2": "Agora ache a letra A! Toque em todas as letras A, grandes e pequenas.",
 "A_g3": "Cubra a letra A com o dedo. Comece na bolinha verde e siga os pontinhos.",
 "A_som": "A",
 "A_sim": "Começa com A!",
 "A_nao": "Não começa com A.",
 "A_fim": "Parabéns! Você aprendeu a letra A.",
 "A_verso": "Amem uns aos outros. João, capítulo treze, versículo trinta e quatro.",
 "E_story": "E de Estrela! Uma estrela bem brilhante mostrou o caminho até o menino Jesus. Toque na letra E para ouvir o som.",
 "E_g1": "Vamos procurar! Toque só nas figuras que começam com o som É.",
 "E_g2": "Agora ache a letra É! Toque em todas as letras É, grandes e pequenas.",
 "E_g3": "Cubra a letra É com o dedo. Comece na bolinha verde e siga os pontinhos.",
 "E_som": "É",
 "E_sim": "Começa com É!",
 "E_nao": "Não começa com É.",
 "E_fim": "Parabéns! Você aprendeu a letra É.",
 "E_verso": "Eu sou a luz do mundo. João, capítulo oito, versículo doze.",
 "I_story": "I de Igreja! Na igreja a gente canta, ora e aprende sobre Jesus. Toque na letra I para ouvir o som.",
 "I_g1": "Vamos procurar! Toque só nas figuras que começam com o som I.",
 "I_g2": "Agora ache a letra I! Toque em todas as letras I, grandes e pequenas.",
 "I_g3": "Cubra a letra I com o dedo. Comece na bolinha verde e siga os pontinhos.",
 "I_som": "I",
 "I_sim": "Começa com I!",
 "I_nao": "Não começa com I.",
 "I_fim": "Parabéns! Você aprendeu a letra I.",
 "I_verso": "Ide por todo o mundo. Marcos, capítulo dezesseis, versículo quinze.",
 "O_story": "O de Ovelha! Jesus é o bom pastor, e cuida de cada ovelhinha com muito amor. Toque na letra O para ouvir o som.",
 "O_g1": "Vamos procurar! Toque só nas figuras que começam com o som Ó.",
 "O_g2": "Agora ache a letra Ó! Toque em todas as letras Ó, grandes e pequenas.",
 "O_g3": "Cubra a letra Ó com o dedo. Comece na bolinha verde e siga os pontinhos.",
 "O_som": "Ó",
 "O_sim": "Começa com Ó!",
 "O_nao": "Não começa com Ó.",
 "O_fim": "Parabéns! Você aprendeu a letra Ó.",
 "O_verso": "O Senhor é o meu pastor. Salmo vinte e três, versículo um.",
 "U_story": "U de Uva! Na terra que Deus prometeu, o povo achou um cacho de uvas bem grande. Toque na letra U para ouvir o som.",
 "U_g1": "Vamos procurar! Toque só nas figuras que começam com o som U.",
 "U_g2": "Agora ache a letra U! Toque em todas as letras U, grandes e pequenas.",
 "U_g3": "Cubra a letra U com o dedo. Comece na bolinha verde e siga os pontinhos.",
 "U_som": "U",
 "U_sim": "Começa com U!",
 "U_nao": "Não começa com U.",
 "U_fim": "Parabéns! Você aprendeu a letra U.",
 "U_verso": "Um só Deus e Pai de todos. Efésios, capítulo quatro, versículo seis.",
 "w_abelha": "Abelha.",
 "w_abacaxi": "Abacaxi.",
 "w_abacate": "Abacate.",
 "w_arvore": "Árvore.",
 "w_arcoiris": "Arco-íris.",
 "w_apito": "Apito.",
 "w_abobora": "Abóbora.",
 "w_estrela": "Estrela.",
 "w_escova": "Escova.",
 "w_escada": "Escada.",
 "w_envelope": "Envelope.",
 "w_escudo": "Escudo.",
 "w_igreja": "Igreja.",
 "w_ioio": "Ioiô.",
 "w_ilha": "Ilha.",
 "w_ima": "Ímã.",
 "w_iglu": "Iglu.",
 "w_ovo": "Ovo.",
 "w_ovelha": "Ovelha.",
 "w_olho": "Olho.",
 "w_oculos": "Óculos.",
 "w_onda": "Onda.",
 "w_osso": "Osso.",
 "w_uva": "Uva.",
 "w_urso": "Urso.",
 "w_um": "Um.",
 "w_bola": "Bola.",
 "w_peixe": "Peixe.",
 "w_lua": "Lua.",
 "w_sol": "Sol.",
 "w_casa": "Casa.",
 "w_pato": "Pato."
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8" } });
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => null);
  const { data: files, error: lerr } = await sb.storage.from(BUCKET).list(DIR, { limit: 1000 });
  if (lerr) return json({ erro: "storage: " + lerr.message }, 500);
  const have = new Set((files ?? []).map((f) => f.name));
  const keys = Object.keys(P);
  const missing = keys.filter((k) => !have.has(k + ".mp3"));
  const status = { total: keys.length, prontos: keys.length - missing.length, faltam: missing.length,
    caracteres_faltando: missing.reduce((n, k) => n + P[k].length, 0), tem_chave: !!Deno.env.get("ELEVENLABS_API_KEY") };
  if (!url.searchParams.has("gerar")) return json(status);
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return json({ ...status, erro: "segredo ELEVENLABS_API_KEY nao configurado" }, 400);
  const feitos: string[] = []; const erros: string[] = []; let chars = 0;
  for (const k of missing.slice(0, 10)) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
        method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ text: P[k], model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
      if (!r.ok) { erros.push(k + ": " + r.status + " " + (await r.text()).slice(0, 160)); if (r.status === 401 || r.status === 429) break; continue; }
      const buf = new Uint8Array(await r.arrayBuffer());
      const up = await sb.storage.from(BUCKET).upload(`${DIR}/${k}.mp3`, buf, { contentType: "audio/mpeg", upsert: false });
      if (up.error) { erros.push(k + ": upload " + up.error.message); continue; }
      feitos.push(k); chars += P[k].length;
    } catch (e) { erros.push(k + ": " + String(e).slice(0, 120)); }
  }
  return json({ gerados_agora: feitos.length, caracteres_gastos_agora: chars, faltam: missing.length - feitos.length, erros });
});
