
# Spectator Mode (Foundry VTT v11/v12)

Mark specific users as **spectators** so they can see the scene and use **Chat only**.  
Left toolbar, hotbar, other sidebar tabs, and global hotkeys are hidden/blocked for those users.

## Install (Local)

1. **Download the ZIP** from this chat.
2. Unzip into your Foundry **User Data** directory under `Data/modules/` so you get:
   ```
   Data/
     modules/
       spectator-mode/
         module.json
         scripts/spectator.js
         styles/spectator.css
         templates/spectator-config.hbs
   ```
   > To locate your User Data path, open Foundry's **Configuration** dialog (gear on the main launcher) → **User Data**.

3. Launch your world and go to **Game Settings → Manage Modules** and enable **Spectator Mode**.
4. In **Game Settings → Module Settings → Spectator Users**, pick which users are spectators.

### Quick GM command
In chat, type:
```
/spectator @User on
/spectator @User off
```

## Notes
- This is a **client-side UI lock** intended for trusted audience users.
- To harden further, set their document permissions appropriately (Observer/None) and avoid giving them owned tokens.

MIT License.
