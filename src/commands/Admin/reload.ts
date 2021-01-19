import { MessageUtil } from "../../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../../lib/extensions/message";
import { EventType } from "../../../lib/ws/util/constants";
import { FireGuild } from "../../../lib/extensions/guild";
import { Language } from "../../../lib/util/language";
import { Listener } from "../../../lib/util/listener";
import { Command } from "../../../lib/util/command";
import { Module } from "../../../lib/util/module";
import { Message } from "../../../lib/ws/Message";
import { Argument } from "discord-akairo";

export default class Reload extends Command {
  constructor() {
    super("reload", {
      description: (language: Language) =>
        language.get("RELOAD_COMMAND_DESCRIPTION"),
      clientPermissions: ["ADD_REACTIONS"],
      args: [
        {
          id: "module",
          type: Argument.union("command", "language", "listener", "module", [
            "*",
          ]),
          readableType: "command|language|listener|module|*",
          default: null,
          required: true,
        },
        {
          id: "broadcast",
          match: "flag",
          flag: "--broadcast",
          default: null,
        },
      ],
      ownerOnly: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      module?: Command | Language | Listener | Module | "*";
      broadcast?: string;
    }
  ) {
    if (!args.module) return await message.error();
    if (args.module == "*") {
      if (this.client.manager.ws)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.guild ? message.guild.shardID : 0,
              cluster: this.client.manager.id,
              action: `All commands/languages/listeners/modules were reloaded`,
            })
          )
        );
      try {
        if (args.broadcast) {
          this.client.manager.ws.send(
            MessageUtil.encode(
              new Message(EventType.LOAD_MODULE, {
                name: "*",
                type: "*",
                action: "reload",
              })
            )
          );
          return await message.react("🔁");
        } else {
          [
            this.client.commandHandler,
            this.client.languages,
            this.client.listenerHandler,
            this.client.modules,
          ].forEach((handler) => handler.reloadAll());
          return await message.success();
        }
      } catch {
        return await message.error();
      }
    }
    try {
      if (this.client.manager.ws)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.guild ? message.guild.shardID : 0,
              cluster: this.client.manager.id,
              action: `${args.module.handler.classToHandle.name} ${args.module.id} was reloaded`,
            })
          )
        );
      if (args.broadcast) {
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.LOAD_MODULE, {
              name: args.module.id,
              type: args.module.handler.classToHandle.name,
              action: "reload",
            })
          )
        );
        return await message.react("🔁");
      } else {
        args.module.reload();
        return await message.success();
      }
    } catch {
      return await message.error();
    }
  }
}
