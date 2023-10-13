<template>
    <div>
        <Hero title='设置'
              :subtitle='`${appName}: ` + managerVersionNumber.toString() + ` 的高级选项`'
              heroType='is-info'/>
        <div class="margin-right">
            <div class="sticky-top sticky-top--opaque sticky-top--no-shadow sticky-top--no-padding">
                <div class='border-at-bottom'>
                    <div class='card is-shadowless is-square'>
                        <div class='card-header-title'>
                            <span class="non-selectable margin-right" style="white-space: nowrap">搜索:</span>
                            <input v-model='search' class="input" type="text" placeholder="搜索选项"/>
                        </div>
                    </div>
                </div>
                <div class="tabs">
                    <ul>
                        <li v-for="(key, index) in tabs" :key="`tab-${key}`"
                            :class="[{'is-active': activeTab === key}]"
                            @click="changeTab(key)">
                            <a>{{tabToText(key)}}</a>
                        </li>
                    </ul>
                </div>
            </div>
            <template v-if="activeTab === 'All'">
                <SettingsItem v-for="(key, _) in searchableSettings" :key="`setting-${key.action}`"
                              :action="key.action"
                              :description="key.description"
                              :value="key.value"
                              :icon="key.icon"
                              @click="key.clickAction()"/>
            </template>
            <template v-else>
                <SettingsItem v-for="(key, _) in getFilteredSettings()" :key="`setting-${key.action}`"
                              :action="key.action"
                              :description="key.description"
                              :value="key.value"
                              :icon="key.icon"
                              @click="key.clickAction()"/>
            </template>
        </div>
    </div>
</template>

<script lang="ts">

import { Watch } from 'vue-property-decorator';
import Component, { mixins } from 'vue-class-component';
import SettingsItem from './SettingsItem.vue';
import SettingsRow from '../../model/settings/SettingsRow';
import ManagerSettings from '../../r2mm/manager/ManagerSettings';
import GameDirectoryResolverProvider from '../../providers/ror2/game/GameDirectoryResolverProvider';
import R2Error from '../../model/errors/R2Error';
import PathResolver from '../../r2mm/manager/PathResolver';
import LogOutputProvider from '../../providers/ror2/data/LogOutputProvider';
import VersionNumber from '../../model/VersionNumber';
import ManagerInformation from '../../_managerinf/ManagerInformation';
import { Hero } from '../all';
import ProfileModList from '../../r2mm/mods/ProfileModList';
import ManifestV2 from '../../model/ManifestV2';
import Game from '../../model/game/Game';
import { StorePlatform } from '../../model/game/StorePlatform';
import moment from 'moment';
import UtilityMixin from '../mixins/UtilityMixin.vue';
import CdnProvider from '../../providers/generic/connection/CdnProvider';

@Component({
        components: {
            SettingsItem,
            Hero
        }
    })
    export default class SettingsView extends mixins(UtilityMixin) {

        private activeTab: string = 'All';
        private tabs = ['All', 'Profile', 'Locations', 'Debugging', 'Modpacks', 'Other'];
        private logOutput: LogOutputProvider = LogOutputProvider.instance;
        private search: string = '';
        private managerVersionNumber: VersionNumber = ManagerInformation.VERSION;
        private searchableSettings: SettingsRow[] = [];

        get activeGame(): Game {
            return this.$store.state.activeGame;
        }

        get settings(): ManagerSettings {
            return this.$store.getters['settings'];
        };

        get localModList(): ManifestV2[] {
            return this.$store.state.profile.modList;
        }

        get appName(): string {
            return ManagerInformation.APP_NAME;
        }

        tabToText(str: string): string {
            switch (str) {
            case 'All': return '全部';
            case 'Profile': return '用户配置';
            case 'Locations': return '路径配置';
            case 'Debugging': return '调试';
            case 'Modpacks': return 'Mod包';
            case 'Other': return '其他';
            default: return '';
            }
        }

        private settingsList = [
            new SettingsRow(
                'Locations',
                '浏览数据目录',
                '打开所有游戏mod及其用户配置所属的目录。',
                async () => PathResolver.ROOT,
                'fa-door-open',
                () => {
                    this.emitInvoke('BrowseDataFolder');
                }
            ),
            new SettingsRow(
                'Locations',
                `切换 ${this.activeGame.displayName} 游戏目录`,
                `切换 ${this.appName} 运行 ${this.activeGame.displayName} 的游戏路径。`,
                async () => {
                    if (this.settings.getContext().gameSpecific.gameDirectory !== null) {
                        const directory = await GameDirectoryResolverProvider.instance.getDirectory(this.activeGame);
                        if (!(directory instanceof R2Error)) {
                            return directory;
                        }
                    }
                    return '请手动设置';
                },
                'fa-folder-open',
                () => {
                    if (StorePlatform.XBOX_GAME_PASS == this.activeGame.activePlatform.storePlatform) {
                        this.emitInvoke('ChangeGameDirectoryGamePass');
                    }
                    else {
                        this.emitInvoke('ChangeGameDirectory');
                    }
                }
            ),
            new SettingsRow(
                'Locations',
                '浏览用户配置目录',
                '打开当前用户配置目录。',
                async () => {
                    return this.$store.getters['profile/activeProfile'].getPathOfProfile();
                },
                'fa-door-open',
                () => this.emitInvoke('BrowseProfileFolder')
            ),
            new SettingsRow(
                'Locations',
                '切换数据文件路径',
                '切换所有游戏mod和用户配置存储的路径，原目录不会被删除，数据不会被转移到新目录。',
                async () => {
                    return PathResolver.ROOT;
                },
                'fa-folder-open',
                () => this.emitInvoke('ChangeDataFolder')
            ),
            new SettingsRow(
                'Debugging',
                '复制log文件内容到剪贴板',
                '复制LogOutput.log文件内容到剪贴板，使用Discord格式。',
                async () => this.doesLogFileExist(),
                'fa-clipboard',
                () => this.emitInvoke('CopyLogToClipboard')
            ),
            new SettingsRow(
                'Debugging',
                '切换下载缓存',
                '下载mod时忽略存储在缓存里的数据。之后下载的mod数据依然会被保存在cache里。',
                async () => {
                    return this.settings.getContext().global.ignoreCache
                        ? '当前设置：缓存已禁用'
                        : '当前设置：缓存已启用(推荐)';
                },
                'fa-exchange-alt',
                () => this.emitInvoke('ToggleDownloadCache')
            ),
            new SettingsRow(
                'Debugging',
                '修复preloader',
                '点击可以修复大多数preloader的报错或重复的程序集。',
                async () => `这将删除"${this.activeGame.dataFolderName}/Managed"目录并调用Steam的完整性检查`,
                'fa-wrench',
                () => this.emitInvoke('RunPreloaderFix')
            ),
            new SettingsRow(
                'Debugging',
                '设置启动参数',
                '提供自定义的游戏启动参数。',
                async () => '这些参数将加在Steam可执行文件启动游戏的完整命令行最后',
                'fa-wrench',
                () => this.emitInvoke('SetLaunchParameters')
            ),
            new SettingsRow(
                'Debugging',
                '清理mod缓存',
                '清理不属于任何用户配置的额外缓存以释放磁盘空间。',
                async () => '检查所有用户配置并清理缓存',
                'fa-trash',
                () => this.emitInvoke('CleanCache')
            ),
            new SettingsRow(
                'Debugging',
                'Toggle preferred Thunderstore CDN',
                'Switch the CDN until app is restarted. This might bypass issues with downloading mods.',
                async () => `Current: ${CdnProvider.current.label} (${CdnProvider.current.url})`,
                'fa-exchange-alt',
                CdnProvider.togglePreferredCdn
            ),
            new SettingsRow(
                'Profile',
                '切换用户配置',
                '切换mod的用户配置。',
                async () => {
                    return `当前用户配置: ${this.$store.getters['profile/activeProfile'].getProfileName()}`
                },
                'fa-file-import',
                () => this.emitInvoke('ChangeProfile')
            ),
            new SettingsRow(
                'Profile',
                '启用所有mod',
                '启用当前用户配置的所有mod。',
                async () => `${this.localModList.length - ProfileModList.getDisabledModCount(this.localModList)}/${this.localModList.length} 已启用`,
                'fa-file-import',
                () => this.emitInvoke('EnableAll')
            ),
            new SettingsRow(
                'Profile',
                '禁用所有mod',
                '禁用当前用户配置的所有mod。',
                async () => `${ProfileModList.getDisabledModCount(this.localModList)}/${this.localModList.length} 已禁用`,
                'fa-file-import',
                () => this.emitInvoke('DisableAll')
            ),
            new SettingsRow(
                'Profile',
                '导入本地mod',
                '从本地文件离线安装mod。',
                async () => '并非所有mod都可以本地安装',
                'fa-file-import',
                () => this.emitInvoke('ImportLocalMod')
            ),
            new SettingsRow(
                'Profile',
                '导出用户配置为文件',
                '将mod列表和配置导出为文件。',
                async () => '导出的文件可以和朋友共享以便捷地获得完全相同的游戏体验',
                'fa-file-export',
                () => this.emitInvoke('ExportFile')
            ),
            new SettingsRow(
                'Profile',
                '导出用户配置为代码',
                '将mod列表和配置导出为代码。',
                async () => '导出的代码可以和朋友共享以便捷地获得完全相同的游戏体验',
                'fa-file-export',
                () => this.emitInvoke('ExportCode')
            ),
            new SettingsRow(
                'Profile',
                '更新所有mod',
                '一键更新所有已安装mod到最新版本。',
                async () => {
                    const outdatedMods = this.$store.getters['profile/modsWithUpdates'];
                    return `${outdatedMods.length}个mod有可用更新`;
                },
                'fa-cloud-upload-alt',
                () => this.emitInvoke('UpdateAllMods')
            ),
            new SettingsRow(
                'Other',
                '切换funky模式',
                '启用/禁用funky模式。',
                async () => {
                    return this.settings.getContext().global.funkyModeEnabled
                        ? '当前配置：启用'
                        : '当前配置：禁用(默认)';
                },
                'fa-exchange-alt',
                () => this.emitInvoke('ToggleFunkyMode')
            ),
            new SettingsRow(
                'Other',
                '切换主题',
                '在亮暗主题之间切换。',
                async () => {
                    return this.settings.getContext().global.darkTheme
                        ? '当前配置：黑暗主题'
                        : '当前配置：明亮主题(默认)';
                },
                'fa-exchange-alt',
                () => this.emitInvoke('SwitchTheme')
            ),
            new SettingsRow(
                'Other',
                '切换卡片展示方式',
                '切换卡片展示为展开或折叠形态。',
                async () => {
                    return this.settings.getContext().global.expandedCards
                        ? '当前配置：展开'
                        : '当前配置：折叠(默认)';
                },
                'fa-exchange-alt',
                () => this.emitInvoke('SwitchCard')
            ),
            new SettingsRow(
                'Other',
                '刷新在线mod列表',
                '下载mod列表以检查更新。',
                async () => {
                        if (this.$store.state.tsMods.isBackgroundUpdateInProgress) {
                            return "正在检查mod更新";
                        }
                        if (this.$store.state.tsMods.connectionError.length > 0) {
                            return "无法获取mod更新: " + this.$store.state.tsMods.connectionError;
                        }
                        if (this.$store.state.tsMods.modsLastUpdated !== undefined) {
                            return "缓存时间: " + moment(this.$store.state.tsMods.modsLastUpdated).format("MMMM Do YYYY, h:mm:ss a");
                        }
                        return "没有可用的API信息";
                    },
                'fa-exchange-alt',
                async () => {
                    if (this.$store.state.tsMods.isBackgroundUpdateInProgress) {
                        return;
                    }

                    this.$store.commit("tsMods/startBackgroundUpdate");
                    this.$store.commit("tsMods/setConnectionError", "");

                    try {
                        await this.refreshThunderstoreModList();
                    } catch (e) {
                        this.$store.commit("tsMods/setConnectionError", e);
                    } finally {
                        this.$store.commit("tsMods/finishBackgroundUpdate");
                    }
                }
            ),
            new SettingsRow(
              'Other',
              '切换游戏',
              '切换当前选择的游戏 (将重启管理器)。',
              async () => "",
                'fa-gamepad',
                async () => {
                    await ManagerSettings.resetDefaults();
                    await this.$router.push({name: 'index'});
                }
            ),
            new SettingsRow(
                'Modpacks',
                '显示依赖字符串列表',
                '显示已安装的mod列表在manifest内的依赖字符串形式。',
                async () => `显示${this.localModList.length}个mod的依赖字符串`,
                'fa-file-alt',
                () => this.emitInvoke('ShowDependencyStrings')
            ),
        ];

        @Watch('search')
        onSearchChange() {
            this.searchableSettings = this.settingsList
                .filter(value =>
                    value.action.toLowerCase().indexOf(this.search.toLowerCase()) >= 0
                    || value.description.toLowerCase().indexOf(this.search.toLowerCase()) >= 0);
        }

        getFilteredSettings(): Array<SettingsRow> {
            return this.searchableSettings.filter(value => value.group.toLowerCase() === this.activeTab.toLowerCase())
                .sort((a, b) => a.action.localeCompare(b.action));
        }

        async created() {
            if ([StorePlatform.STEAM, StorePlatform.STEAM_DIRECT].includes(this.activeGame.activePlatform.storePlatform)) {
                this.settingsList.push(
                    new SettingsRow(
                        'Locations',
                        '切换Steam路径',
                        `切换${this.appName}使用的Steam安装路径。`,
                        async () => {
                            if (this.settings.getContext().global.steamDirectory !== null) {
                                const directory = await GameDirectoryResolverProvider.instance.getSteamDirectory();
                                if (!(directory instanceof R2Error)) {
                                    return directory;
                                }
                            }
                            return '请手动设置';
                        },
                        'fa-folder-open',
                        () => this.emitInvoke('ChangeSteamDirectory')
                    )
                )
            }
            this.settingsList = this.settingsList.sort((a, b) => a.action.localeCompare(b.action));
            this.searchableSettings = this.settingsList;

            const gameDirectory = await GameDirectoryResolverProvider.instance.getDirectory(this.activeGame);
            if (!(gameDirectory instanceof R2Error)) {
                await this.settings.setGameDirectory(gameDirectory);
            }

            const steamDirectory = await GameDirectoryResolverProvider.instance.getSteamDirectory();
            if (!(steamDirectory instanceof R2Error)) {
                await this.settings.setSteamDirectory(steamDirectory);
            }
        }

        changeTab(tab: string) {
            this.activeTab = tab;
        }

        emitInvoke(invoked: string) {
            this.$emit('setting-invoked', invoked);
        }

        doesLogFileExist() {
            return this.logOutput.exists ? 'Log文件存在' : 'Log文件不存在';
        }
    }
</script>
