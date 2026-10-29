# Sensivo — Creator Intelligence

**Transforme comentários em decisões de conteúdo.**

Sensivo é uma aplicação web local que organiza comentários, identifica padrões na conversa e ajuda criadores a planejar próximos conteúdos. Combina análise por regras, classificação com **Qwen 3 via Ollama** e geração de roteiros fundamentados em comentários da própria audiência.

> **Status:** MVP / projeto de portfólio (v5.9.10). O sistema funciona localmente; não é um serviço SaaS hospedado nem oferece integração automática universal com redes sociais.

## O que faz

- **Biblioteca:** importe e organize publicações e comentários por CSV, TXT ou JSON; a coleta via Instagram/Apify é opcional.
- **Insights:** veja sentimentos, intenções, assuntos e comentários usados como evidência.
- **Inteligência IA:** classifique comentários com o modelo local e revise classificações manualmente.
- **Ideias de conteúdo:** gere recomendações fundamentadas em comentários, com explicações e referências. A v5.9.10 filtra sugestões excessivamente semelhantes e pode retornar menos de quatro ideias quando não houver evidência suficiente.
- **Sensivo Radar:** descubra oportunidades recorrentes entre publicações e salve ideias no planejamento local.
- **AI Content Studio:** crie roteiros para **Instagram Reels, TikTok e YouTube Shorts**, escolhendo plataforma, duração e tom.
- **Exportação:** faça backup da biblioteca e exporte relatórios por publicação.

**Importante:** Reels, TikTok e Shorts são formatos de **roteiro**. Exibir seus logotipos não significa que o Sensivo se conecta automaticamente a todas essas redes para buscar comentários.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | HTML, CSS e JavaScript (ES modules) |
| Servidor | Python (`http.server`) |
| Validação de dados | Pydantic 2 |
| IA generativa | Qwen 3 4B via Ollama local |
| Armazenamento da biblioteca | `localStorage` do navegador |
| Coleta opcional | Apify (token configurado pelo usuário) |
| Testes | `unittest` e Node.js |

## Instalação local

**Pré-requisitos:** Python 3.10+, Ollama e o modelo `qwen3:4b`. Node.js é opcional e necessário apenas para executar os testes de frontend.

```bash
# Na pasta do repositório
python -m venv .venv
```

Ative o ambiente virtual:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **Linux/macOS:** `source .venv/bin/activate`

Se o PowerShell bloquear a ativação, você pode usar diretamente `.\.venv\Scripts\python.exe` nos comandos Python, sem alterar a política de execução.

```bash
python -m pip install -r requirements.txt
ollama pull qwen3:4b
python server.py
```

Mantenha o Ollama em execução e abra **http://localhost:8765**. O servidor escuta apenas em `127.0.0.1` por padrão.

### Primeira análise

1. Abra **Nova análise** e importe `exemplo-audiencia.csv` ou outro arquivo de comentários.
2. Abra a publicação na **Biblioteca** e execute a classificação na aba **Inteligência IA**.
3. Consulte **Insights** e **Ideias** para ver padrões e recomendações.
4. Classifique comentários de outras publicações e abra o **Radar** na Visão geral.
5. Escolha uma oportunidade e use **AI Content Studio** para gerar um roteiro com o Qwen.

### Coleta opcional via Apify

A importação de arquivos funciona sem token. Para habilitar a coleta opcional do Instagram, configure `APIFY_TOKEN` **no ambiente do terminal** antes de executar o servidor. O arquivo `.env.example` é apenas uma referência: o aplicativo não carrega `.env` automaticamente.

```powershell
# Windows PowerShell (na sessão atual)
$env:APIFY_TOKEN="seu_token"
python server.py
```

```bash
# Linux/macOS
export APIFY_TOKEN="seu_token"
python server.py
```

A Apify é um serviço externo, sujeito a preços, limites e termos próprios. **Nunca envie tokens para o GitHub.**

## Testes

```bash
python -m unittest discover -s tests -v
node tests/test_frontend.mjs
```

Os testes automatizados usam simulações de respostas do modelo. Nesta versão, são 14 testes de backend e uma suíte de frontend.  Eles não garantem a qualidade criativa de cada roteiro nem substituem testes manuais no navegador.

## Estrutura do projeto

```text
sensivo/
├── assets/
│   ├── app.js                 # Navegação e interface
│   ├── analysis.js            # Importação e análise por regras
│   ├── intelligence.js        # Agregações e oportunidades
│   ├── intelligence-view.js   # Telas de insights e ideias
│   ├── radar.js               # Radar entre publicações
│   ├── content-studio.js      # Interface do gerador de roteiros
│   ├── styles.css             # Identidade visual
│   └── logos/                 # Imagens locais das plataformas
├── tests/                     # Testes de frontend e backend
├── content_studio.py          # Geração e validação de roteiros
├── llm_engine.py              # Classificação e recomendações com Qwen
├── server.py                  # Servidor local e rotas de API
├── index.html
├── exemplo-audiencia.csv      # Dados fictícios de demonstração
├── requirements.txt
├── CHANGELOG.md
└── .env.example
```

## Como a IA é utilizada

A classificação interpreta até **100 comentários por execução**, dependendo do fluxo. Os resultados da LLM são validados por esquemas Pydantic. O Radar utiliza esses resultados para agrupar sinais por intenção e assunto e ordenar oportunidades por uma **heurística** (frequência, recorrência e tipo de interação). O briefing inicial do Radar é estruturado por regras; o **AI Content Studio** chama o Qwen para gerar o roteiro.

As recomendações incluem referências a comentários, mas **a IA pode errar** ou extrapolar o contexto. A aplicação não assiste aos vídeos nem prevê viralização, alcance ou conversão.

## Privacidade e limitações

- A biblioteca é salva no `localStorage` do navegador, **não em um banco de dados**. Faça backup antes de limpar os dados do site ou trocar de navegador.
- O processamento com Ollama é local; a coleta opcional via Apify envolve serviço externo.
- Relatórios e backups podem conter comentários e nomes de usuário. Não publique dados reais sem autorização ou base adequada.
- A avaliação humana cobre apenas as classificações revisadas, não mede automaticamente a acurácia geral.
- A aplicação é um protótipo local; não possui autenticação, sincronização entre dispositivos ou infraestrutura de produção.
- Os logotipos de plataformas são usados para identificar formatos e permanecem marcas de seus respectivos titulares; não implicam parceria ou endosso.

## Roadmap

- Testar as recomendações com criadores reais e documentar feedback.
- Avaliar a qualidade dos roteiros e a rastreabilidade das evidências.
- Considerar persistência além do navegador e integrações oficiais, conforme viabilidade e permissões.

## Histórico e contribuição

Consulte [CHANGELOG.md](CHANGELOG.md). Antes de abrir uma issue, verifique se o problema ocorre com a versão atual e inclua passos para reproduzir, **sem colar tokens ou comentários privados**.

**Licença:** ainda não foi escolhida. Até a inclusão de um arquivo `LICENSE`, não presuma permissão de reutilização do código por terceiros.
