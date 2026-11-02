import { pool } from './db.js';

const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM gifts');
if (rows[0].n > 0) {
  console.log('A tabela já tem itens; seed ignorado.');
  await pool.end();
  process.exit(0);
}

// taken: true = já presenteado (ajuste o nome depois, se quiser)
const gifts = [
  { name: 'Geladeira', category: 'Eletrodomésticos', priority: 'Alta', brand: 'Consul' },
  { name: 'Máquina de lavar', category: 'Eletrodomésticos', priority: 'Alta', brand: 'Whirlpool' },
  { name: 'Fogão', category: 'Eletrodomésticos', priority: 'Alta', brand: 'Consul', taken: true,
    link: 'https://www.mercadolivre.com.br/fogo-cooktop-com-alimentaco-gas-consul-cd060be-cor-preto-4-queimadores/p/MLB56981705' },
  // ATENÇÃO: no código antigo este item se chamava "Cama" mas tinha marca e link de um forno Consul.
  { name: 'Forno elétrico', category: 'Eletrodomésticos', priority: 'Média', brand: 'Consul',
    link: 'https://www.mercadolivre.com.br/forno-embutir-eletrico-consul-47l-funco-gratinar-cob47be-preto/p/MLB47712152' },
  { name: 'Airfryer', category: 'Eletroportáteis', priority: 'Média', brand: 'Mondial' },
  { name: 'Cama baú', category: 'Móveis', priority: 'Alta' },
  { name: 'Sofá', category: 'Móveis', priority: 'Média' },
  { name: 'Sanduicheira', category: 'Eletroportáteis', priority: 'Baixa' },
  // ATENÇÃO: marca e link da TV LG estavam na "Sanduicheira" no código antigo.
  { name: 'Televisão', category: 'Eletrodomésticos', priority: 'Média', brand: 'LG',
    link: 'https://www.mercadolivre.com.br/smart-tv-lg-43full-hd-processador-a5-ger6-ai-alexa-e-webos-23-43lr6700psa/p/MLB39205913' },
  { name: 'Ventilador', category: 'Eletroportáteis', priority: 'Baixa' },
  { name: 'Ferro de passar', category: 'Eletroportáteis', priority: 'Baixa',
    link: 'https://www.mercadolivre.com.br/ferro-de-passar-roupa-black-decker-vfa1110tm2-com-base-de-aluminio/p/MLB15553602' },
  { name: 'Jogo de toalhas', category: 'Roupas', priority: 'Média', taken: true },
  { name: 'Micro-ondas', category: 'Eletrodomésticos', priority: 'Alta', taken: true },
  { name: 'Aspirador de pó', category: 'Eletroportáteis', priority: 'Média' },
  { name: 'Jogo de panelas', category: 'Utensílios', priority: 'Média', brand: 'Brinox', taken: true,
    link: 'https://www.mercadolivre.com.br/jogo-de-panelas-smart-plus-vanilla-induco-cermico-5pecas-brinox-4774101/p/MLB32675228' },
  { name: 'Pix', category: 'Contribuição', priority: 'Alta', reusable: true, pixKey: process.env.PIX_KEY || null }
];

for (const g of gifts) {
  await pool.query(
    `INSERT INTO gifts (name, category, priority, brand, link, pix_key, reusable, reserved_by, reserved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8::text IS NULL THEN NULL ELSE now() END)`,
    [g.name, g.category, g.priority, g.brand ?? null, g.link ?? null, g.pixKey ?? null,
     g.reusable ?? false, g.taken ? 'Um convidado' : null]
  );
}
console.log(`${gifts.length} itens inseridos.`);
await pool.end();
