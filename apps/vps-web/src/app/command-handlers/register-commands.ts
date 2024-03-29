import { ICommandHandler } from '@devhelpr/visual-programming-system';
import { AddNodeCommand } from './add-node-command/add-node-command';
import { DeleteNodeCommand } from './delete-node-command/delete-node-command';
import { PasteNodeCommand } from './paste-node-command/paste-node-command';
import { CopyNodeCommand } from './copy-node-command/copy-node-command';
import { BaseNodeInfo } from '../types/base-node-info';
import { ICommandContext } from './command-context';
import { AutoAlignCommand } from './auto-align-command/auto-align-command';

export const registerCommands = <T extends BaseNodeInfo>(
  commandContext: ICommandContext<T>
) => {
  commandContext.commandRegistry.set(
    'add-node',
    new AddNodeCommand<T>(commandContext)
  );
  commandContext.commandRegistry.set(
    'delete-node',
    new DeleteNodeCommand<T>(commandContext)
  );
  commandContext.commandRegistry.set(
    'copy-node',
    new CopyNodeCommand<T>(commandContext)
  );
  commandContext.commandRegistry.set(
    'paste-node',
    new PasteNodeCommand<T>(commandContext)
  );
  commandContext.commandRegistry.set(
    'auto-align',
    new AutoAlignCommand<T>(commandContext)
  );
};

export const executeCommand = (
  commandRegistry: Map<string, ICommandHandler>,
  commandName: string,
  parameter1?: any,
  parameter2?: any
) => {
  const command = commandRegistry.get(commandName);
  if (command) {
    command.execute(parameter1, parameter2);
  }
};
