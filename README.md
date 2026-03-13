# CryptoSuite Pro

Una plataforma integral construida enteramente en Frontend (Client-Side) para el análisis, descubrimiento, cifrado y empaquetado seguro de datos. Este proyecto fusiona algoritmos clásicos, análisis heurístico y cifrado simétrico/asimétrico moderno utilizando la API nativa de criptografía web.

## 🚀 Tecnologías Destacadas
* **Web Crypto API (Nativo):** Implementación de firmas digitales y gestión de llaves asimétricas **RSA (RSASSA-PKCS1-v1_5)** con firmas SHA-256/384.
* **CryptoJS:** Soporte para cifradores de flujo y bloques como **AES-256, TripleDES, Rabbit y RC4**.
* **Motor Heurístico Javascript:** Escáner basado en frecuencias de lenguaje natural y diccionarios para descifrar automáticamente algoritmos de desplazamiento clásico (César interactivo, ROT13, Atbash, XOR).
* **HTML5 / CSS3 / ES6+:** Arquitectura *Serverless*, garantizando que ningún dato confidencial viaje por la red durante el cifrado/descifrado.
* **GitHub Actions:** CI/CD para despliegue automatizado en GitHub Pages (`static.yml`).

## ⚙️ Características Principales

1. **Gestor de Integridad:** Verificación de archivos codificados mediante la generación y comparación de **Hashes SHA-256**.
2. **Auto-Descubrimiento (Fuerza Bruta Inteligente):** Motor heurístico capaz de probar de manera asíncrona miles de iteraciones de llaves XOR y César, puntuando los resultados basados en n-gramas y palabras de uso común.
3. **Firmas de No-Repudio:** Inyección de firmas en formato PEM (`BEGIN RSA SIGNATURE`) directamente en los payloads.
4. **Protección contra Binarios:** Manejo robusto de `ArrayBuffer` para interpretar correctamente archivos cifrados a nivel de bits (ej. salidas nativas de OpenSSL) previniendo la corrupción UTF-8.

## 🔐 Uso y Privacidad
Al estar diseñado como una PWA arquitectónica, todo el procesamiento ocurre dentro del sandbox del navegador local. Es ideal para entornos de demostración o auditoría *offline*.
