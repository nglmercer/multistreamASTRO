
#### GET

- **Ejemplo para `send`:**
  - URL: `/servermanager/NombreDelServidor/send?cmd=say%20hello`
  - Descripción: Envía el comando `say hello` al servidor especificado.

- **Ejemplo para `sendMultiple`:**
  - URL: `/servermanager/NombreDelServidor/sendMultiple?cmds=["say%20hello", "give%20player1%20diamond"]`
  - Descripción: Envía múltiples comandos al servidor especificado.

#### POST

- **Ejemplo para `send`:**
  - URL: `/servermanager/NombreDelServidor/send`
  - Cuerpo de la solicitud (Body):
    ```json
    {
      "cmd": "say hello"
    }
    ```
  - Descripción: Envía el comando `say hello` al servidor especificado.

- **Ejemplo para `sendMultiple`:**
  - URL: `/servermanager/NombreDelServidor/sendMultiple`
  - Cuerpo de la solicitud (Body):
    ```json
    {
      "cmds": [
        "say uniqueId say hello",
        "say uniqueId say comment",
        "say uniqueId give {likes} likes"
      ]
    }
    ```
  - Descripción: Envía múltiples comandos al servidor especificado.

##### import with [import actions](/Actions?import=action&data={})