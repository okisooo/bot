import { humanize, parseTime } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as moment from "moment";

const repeatRegex = /--repeat (\d*)/gim;
const stepRegex = /--step ([^-]*)/gim;

export default class Remind extends Command {
  constructor() {
    super("remind", {
      description: (language: Language) =>
        language.get("REMIND_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "reminder",
          type: "string",
          description: (language: Language) =>
            language.get("REMIND_ARG_DESCRIPTION"),
          default: null,
          required: true,
        },
      ],
      aliases: ["remindme", "reminder"],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { reminder?: string }) {
    let repeat: number, step: string;
    const repeatExec = repeatRegex.exec(args.reminder);
    if (repeatExec?.length == 2) repeat = parseInt(repeatExec[1]);
    else repeat = 0;
    repeatRegex.lastIndex = 0;
    repeat++;
    if (!repeat || repeat > 6 || repeat < 1)
      return await message.error("REMINDER_INVALID_REPEAT");
    args.reminder = args.reminder.replace(repeatRegex, "");
    const stepExec = stepRegex.exec(args.reminder) || [""];
    stepRegex.lastIndex = 0;
    step = stepExec[0] || "";
    if ((!step && repeat > 1) || (step && repeat == 1))
      return await message.error("REMINDER_SEPARATE_FLAGS");
    args.reminder = args.reminder.replace(stepRegex, "").trimEnd();
    if (!args.reminder) return await message.error("REMINDER_MISSING_ARG");
    const stepMinutes = parseTime(step) as number;
    if (step && stepMinutes > 0 && stepMinutes < 2)
      return await message.error("REMINDER_STEP_TOO_SHORT");
    const parsedMinutes = parseTime(args.reminder) as number;
    if (!parsedMinutes) return await message.error("REMINDER_MISSING_TIME");
    else if (parsedMinutes < 2)
      return await message.error("REMINDER_TOO_SHORT");
    const reminder = parseTime(args.reminder, true) as string;
    if (!reminder.replace(/\s/gim, "").length)
      return await message.error("REMINDER_MISSING_CONTENT");
    const time = new Date();
    const refMoment = moment(time);
    time.setMinutes(time.getMinutes() + parsedMinutes);
    const largestTime = new Date();
    largestTime.setMinutes(
      largestTime.getMinutes() +
        (stepMinutes ? stepMinutes * repeat : parsedMinutes)
    );
    if (
      moment(largestTime).diff(moment(), "days") >= 91 &&
      !message.author.isSuperuser()
    )
      return await message.error("REMINDER_TIME_LIMIT");
    let created: { [duration: string]: boolean } = {};
    for (let i = 0; i < repeat; i++) {
      const currentTime = new Date(time);
      currentTime.setMinutes(time.getMinutes() + stepMinutes * i);
      const remind = await message.author.createReminder(
        currentTime,
        reminder,
        message.url
      );
      const duration = moment(currentTime).diff(refMoment);
      created[humanize(duration, message.language.id.split("-")[0])] = remind;
    }
    const success = Object.entries(created)
      .filter(([, success]) => success)
      .map(([duration]) => duration);
    const failed = Object.entries(created)
      .filter(([, success]) => !success)
      .map(([duration]) => duration);
    return failed.length != repeat
      ? await message.success("REMINDER_CREATED", success, failed)
      : await message.error();
  }
}
