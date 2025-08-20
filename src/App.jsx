import React, { useState, useEffect } from "react";
import Game from "./Game";

/*
  App gerencia a tela inicial e o jogo.
  Idioma: Português (pt-BR)
*/

export default function App(){
  const [started, setStarted] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(true);

  useEffect(()=>{
    function checkOrientation(){
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if(!isMobile) { setIsMobileLandscape(true); return; }
      setIsMobileLandscape(window.innerWidth >= window.innerHeight);
    }
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return ()=> window.removeEventListener("resize", checkOrientation);
  },[]);

  return (
    <div className="app-root">
      {!started ? (
        <div className="start-screen">
          <h1 className="title">Bem-vindo ao Forest Sphere</h1>
          <p className="desc">Um protótipo leve de jogo 3D em primeira pessoa. Explore, colete madeira e divirta-se!</p>
          <button className="enter-btn" onClick={()=> setStarted(true)}>Entrar</button>
          <p style={{marginTop:12, color:"#bcd6ff", fontSize:13}}>Funciona em desktop e mobile. Em celulares, use modo paisagem.</p>
        </div>
      ) : (
        <div className="game-container">
          {!isMobileLandscape && /Mobi|Android/i.test(navigator.userAgent) && (
            <div className="rotate-hint">
              Por favor, vire seu celular para o modo paisagem (deitado) para jogar.
            </div>
          )}
          <Game />
        </div>
      )}
    </div>
  );
}