# JC Condomínio — instalação no Windows

## Requisitos

- Windows 10 ou 11
- Docker Desktop instalado e em execução
- Aproximadamente 4 GB livres para as imagens e o banco local

## Instalação

1. Extraia o arquivo ZIP em uma pasta.
2. Abra o PowerShell nessa pasta.
3. Execute `./instalar.ps1`.
4. Abra `http://localhost:5173` no navegador.
5. No primeiro acesso, crie o administrador pela tela oficial de configuração.

O pacote usa PostgreSQL local em volume Docker. Ele não utiliza o banco H2 do desenvolvimento e não contém os dados reais do ambiente atual.

## Parar e iniciar

```powershell
./parar.ps1
docker compose start
```

Para acompanhar os logs: `docker compose logs -f backend`.

Antes de remover volumes, faça backup do volume `jc_pgdata`. Não use `docker compose down -v` sem confirmar, pois esse comando apaga o banco local do pacote.

O pacote não contém chaves de Pix, boleto, Asaas ou outro provedor. Essas credenciais devem ser configuradas separadamente no `.env`.
