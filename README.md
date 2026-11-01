# ScreenGrando Frontend

Aplicação Angular standalone para criar salas sem login, transmitir tela em `/share/:code` e assistir em `/w/:code`. Angular 20 em modo strict; o SDK `livekit-client` está fixado em 2.22.3.

## Rodar localmente

1. Inicie o backend na porta 8080 e um servidor LiveKit em `ws://localhost:7880`.
2. Execute `npm install` e `npm start`.
3. Acesse `http://localhost:4200`, crie uma sala e inicie o compartilhamento.

A configuração Angular encaminha `/api` para `http://localhost:8080` pelo `proxy.conf.json`.

## Produção

`npm run build` gera os arquivos em `dist/screengrando/browser`. Sirva essa pasta pelo Nginx, habilite fallback para `index.html` e encaminhe `/api` para o Spring Boot. Os clientes conectam diretamente à URL LiveKit dos tokens; essa URL precisa ser pública e usar WSS em produção.

## Verificações

`npm run lint` executa o ESLint. `npm test` executa os specs unitários restantes. O serviço LiveKit usa `LIVEKIT_ROOM_FACTORY` para permitir mock determinístico da sala.
