<div align="center">

# 🎮 Acervo Gamer

**Seu acervo de games completo, open-source e 100% brasileiro.**

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-✅-2ea44f?style=for-the-badge&logo=github)](https://mcookinho.github.io/AcervoGamer/)
[![Firebase](https://img.shields.io/badge/Firebase-☁️-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://console.firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-✨-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Sobre o projeto

O **Acervo Gamer** é um site de acervo de games desenvolvido inteiramente em **português brasileiro**, com foco em preservar e apresentar informações detalhadas sobre jogos indie e AAA. O projeto nasceu da paixão por games e da vontade de criar um catálogo completo, bonito e acessível para a comunidade gamer brasileira.

O site funciona como uma **Single Page Application (SPA)** pura, sem frameworks — apenas HTML, CSS e JavaScript vanilla, hospedado gratuitamente no **GitHub Pages** com backend no **Firebase**.

---

## ✨ Funcionalidades

### 🎮 Catálogo de Jogos
- Cards com **preview animado (GIF)** ao passar o mouse
- Efeito **3D tilt** nos cards com perspectiva dinâmica
- Backgrounds em vídeo aleatórios a cada visita
- **7 abas** de conteúdo por jogo

### 💰 Comparação de Preços
- Preços atualizados **a cada 6 horas** via GitHub Actions
- Comparação entre **17+ lojas** (Steam, GOG, Humble Bundle, Eneba, Fanatical...)
- Conversão automática **USD → BRL**
- Badge **"MELHOR PREÇO"** no card mais barato
- Cupons de desconto quando disponíveis

### 🎵 Trilha Sonora
- **485 faixas** com links para Spotify e YouTube
- Player de áudio global integrado (play, pause, next, prev, volume)
- Duração de cada faixa
- Suporte a campo `extra` para informações adicionais

### 👥 Comunidade
- **Fóruns** com criação de tópicos e respostas
- **Anúncios** da comunidade
- **Perfis** com avatares e banners pré-definidos (personagens de Undertale, Deltarune, Omori)
- Sistema de **comentários** por jogo

### 🔐 Autenticação
- Cadastro e login com **Firebase Auth**
- Confirmação de e-mail obrigatória
- Perfis editáveis com bio, jogo favorito e site pessoal
- ~70 avatares e banners pré-definidos (sem uploads)

### 🎨 Design
- Visual inspirado em **Persona 5** (ângulos afiados, abas animadas)
- Paleta de cores brasileira: **verde, amarelo e azul**
- Fontes **Outfit** (títulos) e **Inter** (corpo)
- Efeito **glassmorphism** nos componentes
- **Canvas de partículas** flutuantes (diamantes, linhas, pontos)
- **Splash screen** animada com logo SVG
- **100% responsivo** (desktop, tablet, mobile)

### ⚙️ Automação
- **GitHub Actions** executando a cada 6 horas
- Script Node.js que busca preços na **CheapShark API**
- Commit automático com preços atualizados

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | HTML5, CSS3, JavaScript vanilla (ES6+) |
| **Roteamento** | Hash-based SPA router customizado |
| **Backend** | Firebase (Firestore + Auth) |
| **Dados** | JSON estático via GitHub Contents API |
| **Cache** | localStorage com TTL de 30 minutos |
| **Preços** | CheapShark API + conversão USD→BRL |
| **CI/CD** | GitHub Actions (Node.js 20) |
| **Fonts** | Google Fonts (Outfit + Inter) |
| **Hospedagem** | GitHub Pages |

> **Zero dependências de build** — sem bundler, sem transpilador. O código roda diretamente no navegador como módulos nativos.

---

## 🤝 Como Contribuir

1. **Fork** o repositório
2. Crie uma branch para sua feature (`git checkout -b feat/nova-funcionalidade`)
3. Faça seu **commit** (`git commit -m 'feat: adicionar nova funcionalidade'`)
4. **Push** para a branch (`git push origin feat/nova-funcionalidade`)
5. Abra um **Pull Request**

### Adicionar um novo jogo

Para adicionar um jogo ao acervo, crie uma pasta em `data/games/{slug}/` com o JSON principal (`{slug}.json`), e opcionalmente pastas `mods/`, `translations/` e um `OPCards.json`.

---

## 📄 Licença

Este projeto está sob a licença **MIT** — veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**Feito com ❤️ para a comunidade gamer brasileira**

*Desenvolvido sem frameworks, sem bundler, sem complicação — apenas código puro.*

</div>
