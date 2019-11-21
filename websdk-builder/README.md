# websdk-builder
Setup instructions:
- Open a terminal
- In terminal, make sure you're in the websdk-builder folder (can use 'cd websdk-builder' to get there from websdk-config-tools)
- Run 'npm install -g'
- Open a new terminal, all the magic can be used now

Update instructions:
- Open a terminal
- In terminal, make sure you're in the websdk-builder folder (can use 'cd websdk-builder' to get there from websdk-config-tools)
- Run 'npm uninstall -g magic --save'
- Run 'npm install -g'
- Open a new terminal, all the magic can be used now

Usage instructions:
- Type 'magic --help' for a list of commands and their descriptions
- Type 'magic command' to run a command, or 'magic command --option' or 'magic command -o' to use an option

More information:
- CCT and NPM are used to store locally commonly reused items that take a long time to download
- Clientconfigs holds actual client configurations and code packages that are currently 'checked out'
- EJS holds the templates containing logic to rebuild code packages from custom configs stored in json format
- FCP holds logic that overwrites the gulp tasks in the client code templates to extend functionality
- Maintainance holds logic and expected values to compare against for jest tests
- Scripts holds all the real business logic