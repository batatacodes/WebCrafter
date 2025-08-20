```md
# Jogo 3D (React + Three.js) - Forest Sphere

Protótipo leve de jogo 3D feito com React + Three.js.

Principais características:
- Tela inicial com botão "Entrar".
- Player em primeira pessoa (colisor esférico invisível).
- Plano com árvores (cilindro + cone).
- Controles virtuais: 2x2 botões à esquerda (Frente, Trás, Esq, Dir), botão "PULAR" central e botão "CORTAR" à direita.
- Movimentação por segurar o botão; pulo; controles por mouse/teclado também.
- Corte de árvore: agora o jogador só precisa estar perto (1–3 metros). A direção da câmera não é mais necessária — qualquer ângulo serve. O jogo corta a árvore mais próxima dentro do alcance.
- Árvore cortada é removida com pequena animação e uma nova árvore nasce em outro local.
- Responsivo para desktop e mobile; pede modo paisagem para mobile.

Como executar:
1. Instale dependências:
   npm install

2. Rode em desenvolvimento:
   npm start

(O projeto foi pensado para rodar com um bundler simples como Parcel; ajuste conforme necessário.)
```