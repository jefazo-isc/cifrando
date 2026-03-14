VERSIÓN PARA GIT

Qué trae:
- Módulo heurístico clásico
- Nuevo módulo de sustitución con alfabeto personalizado
- Generación/firma RSA
- Exportación Base64, Hex, Binario, Reverso, ROT13, Atbash, César, XOR y AES-GCM
- Estilo oscuro tipo cyber/neon

Archivos:
- index.html
- style.css
- app.js
- cipher.js

Cómo subir esta versión al repo:
1. Copia estos 4 archivos a la raíz del repositorio.
2. En terminal:
   git status
   git add index.html style.css app.js cipher.js
   git commit -m "feat: agrega sustitucion personalizada y nueva UI git"
   git push origin main

Uso del nuevo módulo:
1. Pega el alfabeto base en "Alfabeto origen".
2. Pega la cadena/alfabeto cifrado en "Alfabeto destino".
3. Pega el texto en "Texto a traducir".
4. Usa "Descifrar destino → origen".
