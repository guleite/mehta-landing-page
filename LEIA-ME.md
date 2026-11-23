# Mehta · Landing page com simulador de layout

Landing page de apresentação para a Mehta Construções Industrializadas. O usuário envia a planta baixa do terreno, informa suas necessidades e recebe uma proposta visual de distribuição de containers desenhada sobre a própria planta.

## Como abrir

- **Mais simples:** dê dois cliques em `index.html` (Chrome ou Edge).
- **Com servidor local** (recomendado para apresentar):
  ```
  python -m http.server 5517
  ```
  e acesse `http://localhost:5517`.

É preciso internet para as fontes (Google Fonts) e para ler PDFs (pdf.js via CDN). Imagens e a planta de exemplo funcionam offline.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página: hero, como funciona, simulador, soluções, diferenciais, sobre, contato e rodapé |
| `css/style.css` | Identidade visual (laranja `#FF7300`, grafite `#4A4A4A`, ardósia `#516672`, lavanda; Mulish + Roboto Slab) |
| `js/planner.js` | Motor de análise da planta e de distribuição dos containers |
| `js/app.js` | Interface: upload, formulário, etapas, visualização, ajustes, exportação PNG e contato |

## Como o simulador funciona

1. **Upload:** PDF (1ª página), JPG, PNG ou WEBP, até 20 MB. Há também uma planta de exemplo com 2 lotes.
2. **Leitura da planta:** separa linhas, textos e hachuras do fundo e identifica as regiões fechadas (terrenos). Edificações hachuradas ou contornadas, árvores e textos viram obstáculos. Se a detecção falhar, o usuário pode desenhar a área manualmente.
3. **Escala:** a largura informada (em metros) calibra a conversão de pixels para metros.
4. **Distribuição:** cada finalidade tem uma estratégia própria:
   - perimetral para canteiro de obra
   - em U com praça central para comercial e eventos
   - fileiras ventiladas para alojamento
   - blocos acoplados para escritório e saúde
   - linear com pátio de carga para depósito

   Todas mantêm afastamento das divisas e uma faixa de acesso livre de 4 m. Quando o espaço não comporta a quantidade pedida, os módulos empilháveis vão para o 2º nível.
5. **Resultado:** planta com os containers numerados e coloridos por uso, quantidade, finalidade, área útil, ocupação e texto explicativo. O usuário pode arrastar e girar os módulos (conflitos ficam em vermelho), comparar com a planta original, baixar um PNG com a identidade da Mehta e enviar a proposta para orçamento.

## Limitações desta versão (apresentação de layout)

- Tudo roda no navegador, sem servidor. O formulário de contato **não envia** dados: apenas mostra a confirmação.
- As áreas são **estimativas** a partir da imagem. Plantas muito poluídas (cotas sobre o terreno, fotos tortas, cores fortes) podem exigir o desenho manual da área.
- Arquivos DWG não são lidos diretamente; é preciso exportar em PDF.

## Próximos passos sugeridos para produção

- Integrar o formulário ao CRM ou e-mail da Mehta, anexando o PNG da proposta.
- Usar um modelo de visão computacional ou IA no servidor para plantas complexas (identificar cômodos, cotas e norte automaticamente).
- Conectar o catálogo real de modelos (MT 300, MT 301…) às opções de módulo.
