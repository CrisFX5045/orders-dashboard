import { ElementType } from "react";
import {
  RocketLaunchIcon,
  BellAlertIcon,
  CubeIcon,
  UserIcon as HiUserIcon,
} from "@heroicons/react/24/outline";
import { TbCoins, TbDevices, TbPalette } from "react-icons/tb";

import DashboardsIcon from "@/assets/dualicons/dashboards.svg?react";
import AppsIcon from "@/assets/dualicons/applications.svg?react";
import PrototypesIcon from "@/assets/dualicons/prototypes.svg?react";
import FormsIcon from "@/assets/dualicons/forms.svg?react";
import ComponentsIcon from "@/assets/dualicons/components.svg?react";
import DualTableIcon from "@/assets/dualicons/table.svg?react";
import LampIcon from "@/assets/dualicons/lamp.svg?react";
import ChatIcon from "@/assets/nav-icons/chat.svg?react";
import KanbanIcon from "@/assets/nav-icons/kanban.svg?react";
import MailIcon from "@/assets/nav-icons/mail.svg?react";
import CheckDoubleIcon from "@/assets/nav-icons/check-double.svg?react";
import Nft1Icon from "@/assets/nav-icons/nft-1.svg?react";
import Nft2Icon from "@/assets/nav-icons/nft-2.svg?react";
import CloudIcon from "@/assets/nav-icons/cloud.svg?react";
import BotIcon from "@/assets/nav-icons/bot.svg?react";
import MoneyIcon from "@/assets/nav-icons/money.svg?react";
import PinIcon from "@/assets/nav-icons/pin.svg?react";
import StatisticIcon from "@/assets/nav-icons/statistic.svg?react";
import WindowIcon from "@/assets/nav-icons/window.svg?react";
import OrderTimerIcon from "@/assets/nav-icons/shopping-cart.svg?react";
import PersonalChartIcon from "@/assets/nav-icons/personal-chart.svg?react";
import BtcIcon from "@/assets/nav-icons/btc.svg?react";
import BankBuildIcon from "@/assets/nav-icons/bank-build.svg?react";
import Statistic2Icon from "@/assets/nav-icons/statistic-2.svg?react";
import MegaphoneIcon from "@/assets/nav-icons/megaphone.svg?react";
import MapIcon from "@/assets/nav-icons/map.svg?react";
import StudentIcon from "@/assets/nav-icons/student.svg?react";
import StethoscopeIcon from "@/assets/nav-icons/stethoscope.svg?react";
import PeopleIcon from "@/assets/nav-icons/people.svg?react";
import PeopleEditIcon from "@/assets/nav-icons/people-edit.svg?react";
import PeopleMonitorIcon from "@/assets/nav-icons/people-monitor.svg?react";
import TeacherIcon from "@/assets/nav-icons/teacher.svg?react";
import MonitorIcon from "@/assets/nav-icons/monitor.svg?react";
import ProjectBoardIcon from "@/assets/nav-icons/project-board.svg?react";
import WidgetIcon from "@/assets/nav-icons/widget.svg?react";
import OnboardingIcon from "@/assets/nav-icons/onboarding.svg?react";
import UserIcon from "@/assets/nav-icons/user.svg?react";
import DocumentEditIcon from "@/assets/nav-icons/document.svg?react";
import CurrencyDollarIcon from "@/assets/nav-icons/currency-dollar.svg?react";
import QuestionIcon from "@/assets/nav-icons/question.svg?react";
import InvoiceIcon from "@/assets/nav-icons/invoice.svg?react";
import LoginIcon from "@/assets/nav-icons/login.svg?react";
import PeoplePlusIcon from "@/assets/nav-icons/people-plus.svg?react";
import ErrorIcon from "@/assets/nav-icons/error.svg?react";
import TableIcon from "@/assets/dualicons/table.svg?react";
import InputIcon from "@/assets/nav-icons/input.svg?react";
import InputGroupIcon from "@/assets/nav-icons/input-group.svg?react";
import InputMaskIcon from "@/assets/nav-icons/input-mask.svg?react";
import IdIcon from "@/assets/nav-icons/id.svg?react";
import BoxAddIcon from "@/assets/nav-icons/box-add.svg?react";
import DocumentAddIcon from "@/assets/nav-icons/document-add.svg?react";
import CheckboxIcon from "@/assets/nav-icons/checkbox.svg?react";
import RadioIcon from "@/assets/nav-icons/radio.svg?react";
import SwitchIcon from "@/assets/nav-icons/switch.svg?react";
import SwapIcon from "@/assets/nav-icons/swap.svg?react";
import TextareaIcon from "@/assets/nav-icons/textarea.svg?react";
import SelectIcon from "@/assets/nav-icons/select.svg?react";
import CalendarIcon from "@/assets/nav-icons/calendar.svg?react";
import RangeIcon from "@/assets/nav-icons/range.svg?react";
import ValidationIcon from "@/assets/nav-icons/validation.svg?react";
import ActtachmentIcon from "@/assets/nav-icons/attachment.svg?react";
import ModalIcon from "@/assets/nav-icons/modal.svg?react";
import PaginationIcon from "@/assets/nav-icons/pagination.svg?react";
import InfoIcon from "@/assets/nav-icons/info.svg?react";
import CirclebarIcon from "@/assets/nav-icons/circlebar.svg?react";
import ButtonIcon from "@/assets/nav-icons/button.svg?react";
import DocIcon from "@/assets/nav-icons/doc.svg?react";
import SharedComponentsIcon from "@/assets/nav-icons/shared-components.svg?react";
import HooksIcon from "@/assets/nav-icons/hooks.svg?react";
import UtilityIcon from "@/assets/nav-icons/utility.svg?react";
import AttributionsIcon from "@/assets/nav-icons/attributions.svg?react";
import ChangelogsIcon from "@/assets/nav-icons/changelogs.svg?react";
import SettingIcon from "@/assets/dualicons/setting.svg?react";

export const navigationIcons: Record<string, ElementType> = {
  dashboards: DashboardsIcon,
  apps: AppsIcon,
  prototypes: PrototypesIcon,
  forms: FormsIcon,
  components: ComponentsIcon,
  tables: DualTableIcon,
  docs: LampIcon,
  settings: SettingIcon,
  "dashboards.sales": StatisticIcon,
  "dashboards.crm-analytics": WindowIcon,
  "dashboards.orders": OrderTimerIcon,
  "dashboards.crypto": BtcIcon,
  "dashboards.banking": BankBuildIcon,
  "dashboards.personal": PersonalChartIcon,
  "dashboards.cms-analytics": Statistic2Icon,
  "dashboards.influencer": MegaphoneIcon,
  "dashboards.travel": MapIcon,
  "dashboards.teacher": TeacherIcon,
  "dashboards.education": StudentIcon,
  "dashboards.authors": PeopleEditIcon,
  "dashboards.doctor": StethoscopeIcon,
  "dashboards.employees": PeopleIcon,
  "dashboards.workspaces": MonitorIcon,
  "dashboards.meetings": PeopleMonitorIcon,
  "dashboards.projects-board": ProjectBoardIcon,
  "dashboards.widget": WidgetIcon,
  "apps.chat": ChatIcon,
  "apps.ai-chat": BotIcon,
  "apps.kanban": KanbanIcon,
  "apps.mail": MailIcon,
  "apps.todo": CheckDoubleIcon,
  "apps.nft-1": Nft1Icon,
  "apps.nft-2": Nft2Icon,
  "apps.filemanager": CloudIcon,
  "apps.pos": MoneyIcon,
  "apps.travel": PinIcon,
  "prototypes.onboarding": OnboardingIcon,
  "prototypes.users-card": UserIcon,
  "prototypes.blog-card": PeopleEditIcon,
  "prototypes.post-details": DocumentEditIcon,
  "prototypes.price-list": CurrencyDollarIcon,
  "prototypes.help": QuestionIcon,
  "prototypes.invoice": InvoiceIcon,
  "prototypes.sign-in": LoginIcon,
  "prototypes.sign-up": PeoplePlusIcon,
  "prototypes.errors": ErrorIcon,
  "table.item": TableIcon,
  "forms.ekyc-form": IdIcon,
  "forms.add-product-form": BoxAddIcon,
  "forms.new-post-form": DocumentAddIcon,
  "forms.input": InputIcon,
  "forms.input-group": InputGroupIcon,
  "forms.input-mask": InputMaskIcon,
  "forms.checkbox": CheckboxIcon,
  "forms.radio": RadioIcon,
  "forms.switch": SwitchIcon,
  "forms.swap": SwapIcon,
  "forms.textarea": TextareaIcon,
  "forms.select": SelectIcon,
  "forms.range": RangeIcon,
  "forms.listbox": SelectIcon,
  "forms.autocomplete": SelectIcon,
  "forms.file-upload": ActtachmentIcon,
  "forms.form-validation": ValidationIcon,
  "forms.text-editor": TextareaIcon,
  "forms.filepond": ActtachmentIcon,
  "forms.datepicker": CalendarIcon,
  "components.basic-ui": ButtonIcon,
  "components.data-display": DocIcon,
  "components.navigation": PaginationIcon,
  "components.loading": CirclebarIcon,
  "components.feedback": InfoIcon,
  "components.modal": ModalIcon,
  "components.advanced": OnboardingIcon,
  "docs.getting-started": RocketLaunchIcon,
  "docs.shared-components": SharedComponentsIcon,
  "docs.hooks": HooksIcon,
  "docs.utils": UtilityIcon,
  "docs.attributions": AttributionsIcon,
  "docs.changelogs": ChangelogsIcon,
  "settings.general": HiUserIcon,
  "settings.appearance": TbPalette,
  "settings.billing": TbCoins,
  "settings.notifications": BellAlertIcon,
  "settings.applications": CubeIcon,
  "settings.sessions": TbDevices,
};
