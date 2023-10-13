<template>
    <div>

        <div class='inherit-background-colour sticky-top sticky-top--search non-selectable'>
            <div class='is-shadowless is-square'>
                <div class='no-padding-left card-header-title'>

                    <div class="input-group input-group--flex margin-right">
                        <label for="local-search" class="non-selectable">搜索</label>
                        <input id="local-search" v-model='searchQuery' class="input margin-right" type="text" placeholder="搜索已安装的mod"/>
                    </div>

                    <div class="input-group margin-right">
                        <label for="local-sort-order" class="non-selectable">排序</label>
                        <select id="local-sort-order" class="select select--content-spacing margin-right margin-right--half-width" v-model="sortOrder">
                            <option v-for="(key, index) in getSortOrderOptions()" :key="`${index}-deprecated-position-option`">
                                {{key}}
                            </option>
                        </select>
                        <select id="local-sort-direction" class="select select--content-spacing" v-model="sortDirection">
                            <option v-for="(key, index) in getSortDirectionOptions()" :key="`${index}-deprecated-position-option`">
                                {{key}}
                            </option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label for="local-deprecated-position" class="non-selectable">已禁用mod</label>
                        <select id="local-deprecated-position" class="select select--content-spacing" v-model="sortDisabledPosition">
                            <option v-for="(key, index) in getDeprecatedFilterOptions()" :key="`${index}-deprecated-position-option`">
                                {{key}}
                            </option>
                        </select>
                    </div>

                </div>
            </div>
        </div>

        <Modal v-show="showingDependencyList" v-if="selectedManifestMod !== null"
               @close-modal="showingDependencyList = null" :open="showingDependencyList">
            <template v-slot:title>
                <p v-if="dependencyListDisplayType === 'disable'" class='card-header-title'>正在禁用
                    {{selectedManifestMod.getName()}}
                </p>
                <p v-if="dependencyListDisplayType === 'uninstall'" class='card-header-title'>正在卸载
                    {{selectedManifestMod.getName()}}
                </p>
                <p v-if="dependencyListDisplayType === 'view'" class='card-header-title'>{{selectedManifestMod.getName()}}
                    关联的mod
                </p>
            </template>
            <template v-slot:body>
                <div v-if="dependencyListDisplayType === 'disable'" class='notification is-warning'>
                    <p>其他依赖此mod的mod列表。禁用此mod会同时禁用所有依赖者。</p>
                </div>
                <div v-if="dependencyListDisplayType === 'uninstall'" class='notification is-warning'>
                    <p>有其他mod依赖此mod。卸载此mod会同时卸载所有依赖者。</p>
                </div>
                <p v-if="dependencyListDisplayType === 'disable'">禁用的mod列表:</p>
                <p v-if="dependencyListDisplayType === 'uninstall'">卸载的mod列表:</p>
                <br v-if="dependencyListDisplayType !== 'view'"/>
                <div v-if="dependencyListDisplayType !== 'view'">
                    <ul class="list">
                        <li class="list-item">{{selectedManifestMod.getName()}}</li>
                        <li class="list-item" v-for='(key, index) in getDependantList(selectedManifestMod)'
                            :key='`dependant-${index}`'>
                            {{key.getName()}}
                        </li>
                    </ul>
                </div>
                <div v-if="dependencyListDisplayType === 'view'">
                    <div v-if="getDependencyList(selectedManifestMod).size > 0">
                        <h3 class="subtitle is-5">依赖于</h3>
                        <ul class="list">
                            <li class="list-item" v-for='(key, index) in getDependencyList(selectedManifestMod)'
                                :key='`dependency-${index}`'>
                                {{key.getName()}}
                            </li>
                        </ul>
                    </div>
                    <br v-if="getDependencyList(selectedManifestMod).size > 0"/>
                    <div v-if="getDependantList(selectedManifestMod).size > 0">
                        <h3 class="subtitle is-5">依赖者</h3>
                        <ul class="list">
                            <li class="list-item" v-for='(key, index) in getDependantList(selectedManifestMod)'
                                :key='`dependant-${index}`'>
                                {{key.getName()}}
                            </li>
                        </ul>
                    </div>
                </div>
            </template>
            <template v-slot:footer>
                <button v-if="dependencyListDisplayType === 'disable'" class="button is-info"
                        @click="disableMod(selectedManifestMod)">
                    禁用
                </button>
                <button v-if="dependencyListDisplayType === 'uninstall'" class="button is-info"
                        @click="uninstallMod(selectedManifestMod)">
                    卸载
                </button>
                <button v-if="dependencyListDisplayType === 'view'" class="button is-info"
                        @click="selectedManifestMod = null">
                    完成
                </button>
            </template>
        </Modal>

        <slot name="above-list"></slot>

        <draggable v-model='draggableList' group="local-mods" handle=".handle"
                   @start="drag=canShowSortIcons(); $emit('sort-start')"
                   @end="drag=false; $emit('sort-end')"
                   :force-fallback="true"
                   :scroll-sensitivity="100">
            <expandable-card
                v-for='(key, index) in draggableList' :key="`local-${key.getName()}-${getProfileName()}-${index}-${cardExpanded}`"
                @moveUp="moveUp(key)"
                @moveDown="moveDown(key)"
                :image="key.icon"
                :id="index"
                :description="key.description"
                :funkyMode="funkyMode"
                :showSort="canShowSortIcons()"
                :expandedByDefault="cardExpanded"
                :enabled="key.isEnabled()">
                <template v-slot:title>
                    <span class="non-selectable">
                        <span v-if="key.isDeprecated()"
                              class="tag is-danger margin-right margin-right--half-width"
                              v-tooltip.right="'这个mod已被启用，可能无法正常工作'">
                            已启用
                        </span>
                        <span v-if="!key.isEnabled()"
                              class="tag is-warning margin-right margin-right--half-width"
                              v-tooltip.right="'这个mod不会作用于游戏'">
                            已禁用
                        </span>
                        <span class="card-title selectable">
                            <template v-if="key.isEnabled()">
                                {{key.getDisplayName()}} <span class="card-byline selectable">by {{key.getAuthorName()}}</span>
                            </template>
                            <template v-else>
                                <strike class='selectable'>{{key.getDisplayName()}} <span class="card-byline">by {{key.getAuthorName()}}</span></strike>
                            </template>
                        </span>
                    </span>
                </template>
                <template v-slot:other-icons>
                    <!-- Show update and missing dependency icons -->
                    <span class='card-header-icon' v-if="getThunderstoreModFromMod(key) && getThunderstoreModFromMod(key).getDonationLink()">
                        <Link :url="getThunderstoreModFromMod(key).getDonationLink()" target="external" tag="span">
                            <i class='fas fa-heart' v-tooltip.left="'捐赠给mod作者'"></i>
                        </Link>
                    </span>
                    <span class='card-header-icon'
                          @click.prevent.stop="updateMod(key)"
                          v-if="!isLatest(key)">
                        <i class='fas fa-cloud-upload-alt' v-tooltip.left="'有可用的更新'"></i>
                    </span>
                    <span class='card-header-icon'
                          v-if="getMissingDependencies(key).length > 0">
                        <i class='fas fa-exclamation-circle' v-tooltip.left="`缺少${getMissingDependencies(key).length}个依赖`"></i>
                    </span>
                    <span class='card-header-icon'
                          @click.prevent.stop="() => key.isEnabled() ? disableModRequireConfirmation(key) : enableMod(key)">
                        <div class="field">
                          <input id="switchExample" type="checkbox" name="switchExample" :class='`switch is-small  ${key.isEnabled() ? "switch is-info" : ""}`' :checked="key.isEnabled()">
                          <label for="switchExample" v-tooltip.left="key.isEnabled() ? '禁用' : '启用'"></label>
                        </div>
                    </span>
                </template>
                <a class='card-footer-item'
                   @click="uninstallModRequireConfirmation(key)">卸载</a>
                <template>
                    <a class='card-footer-item' @click="disableModRequireConfirmation(key)"
                       v-if="key.enabled">禁用</a>
                    <a class='card-footer-item' @click="enableMod(key)" v-else>启用</a>
                </template>
                <a class='card-footer-item' @click="viewDependencyList(key)">相关mod</a>
                <Link :url="`${key.getWebsiteUrl()}${key.getVersionNumber().toString()}`"
                      :target="'external'"
                      class="card-footer-item">
                        <i class='fas fa-code-branch margin-right margin-right--half-width'></i>
                        {{key.getVersionNumber().toString()}}
                </Link>
                <a class='card-footer-item' v-if="!isLatest(key)" @click="updateMod(key)">Update</a>
                <a class='card-footer-item' v-if="getMissingDependencies(key).length > 0"
                   @click="downloadDependency(getMissingDependencies(key)[0])">
                    下载依赖
                </a>
                <template v-if="getThunderstoreModFromMod(key) !== undefined">
                    <template v-if="getThunderstoreModFromMod(key).getDonationLink() !== undefined">
                        <DonateButton :mod="getThunderstoreModFromMod(key)"/>
                    </template>
                </template>
            </expandable-card>
        </draggable>

        <slot name="below-list"></slot>

    </div>
</template>

<script lang="ts">

import { Component, Vue, Watch } from 'vue-property-decorator';
import ManifestV2 from '../../model/ManifestV2';
import ProfileModList from '../../r2mm/mods/ProfileModList';
import R2Error from '../../model/errors/R2Error';
import ManagerSettings from '../../r2mm/manager/ManagerSettings';
import ModBridge from '../../r2mm/mods/ModBridge';
import Mod from '../../model/Mod';
import DependencyListDisplayType from '../../model/enums/DependencyListDisplayType';
import Dependants from '../../r2mm/mods/Dependants';
import ProfileInstallerProvider from '../../providers/ror2/installing/ProfileInstallerProvider';
import LoggerProvider, { LogSeverity } from '../../providers/ror2/logging/LoggerProvider';
import Profile from '../../model/Profile';
import ThunderstoreMod from '../../model/ThunderstoreMod';
import DownloadModModal from './DownloadModModal.vue';
import { ExpandableCard, Link, Modal } from '../all';
import ModListSort from '../../r2mm/mods/ModListSort';
import { SortDirection } from '../../model/real_enums/sort/SortDirection';
import { SortLocalDisabledMods } from '../../model/real_enums/sort/SortLocalDisabledMods';
import { SortNaming } from '../../model/real_enums/sort/SortNaming';
import GameManager from '../../model/game/GameManager';
import Game from '../../model/game/Game';
import ConflictManagementProvider from '../../providers/generic/installing/ConflictManagementProvider';
import Draggable from 'vuedraggable';
import DonateButton from '../../components/buttons/DonateButton.vue';
import SearchUtils from '../../utils/SearchUtils';

@Component({
        components: {
            DonateButton,
            DownloadModModal,
            Link,
            ExpandableCard,
            Modal,
            Draggable
        }
    })
    export default class LocalModList extends Vue {

        settings: ManagerSettings = new ManagerSettings();

        private cardExpanded: boolean = false;
        private funkyMode: boolean = false;

        get modifiableModList(): ManifestV2[] {
            return ModListSort.sortLocalModList(this.$store.state.localModList, this.sortDirection,
                this.sortDisabledPosition, this.sortOrder);
        }

        get thunderstorePackages(): ThunderstoreMod[] {
            return this.$store.state.thunderstoreModList || [];
        }

        private searchableModList: ManifestV2[] = [];
        private showingDependencyList: boolean = false;
        private selectedManifestMod: ManifestV2 | null = null;
        private dependencyListDisplayType: string = 'view';

        // Filtering
        private sortDisabledPosition: SortLocalDisabledMods = this.settings.getInstalledDisablePosition();
        private sortOrder: SortNaming = this.settings.getInstalledSortBy();
        private sortDirection: SortDirection = this.settings.getInstalledSortDirection();
        private searchQuery: string = '';
        private activeGame: Game | null = null;

        // Context
        private contextProfile: Profile | null = null;

        get draggableList() {
            return [...this.searchableModList]
        }

        set draggableList(newList: ManifestV2[]) {
            ProfileModList.requestLock(async () => {
                const result = await ProfileModList.saveModList(this.contextProfile!, newList);
                if (result instanceof R2Error) {
                    this.emitError(result);
                    return;
                }
                this.$store.dispatch("updateModList", newList);
                const err = await ConflictManagementProvider.instance.resolveConflicts(newList, this.contextProfile!);
                if (err instanceof R2Error) {
                    this.$emit('error', err);
                }
                this.filterModList();
            })
        }

        @Watch("sortOrder")
        sortOrderChanged(newValue: string) {
            this.settings.setInstalledSortBy(newValue);
        }

        @Watch("sortDirection")
        sortDirectionChanged(newValue: string) {
            this.settings.setInstalledSortDirection(newValue);
        }

        @Watch("sortDisabledPosition")
        sortDisabledPositionChanged(newValue: string) {
            this.settings.setInstalledDisablePosition(newValue);
        }

        @Watch('modifiableModList')
        modListUpdated() {
            this.filterModList();
        }

        @Watch('searchQuery')
        filterModList() {
            if (this.searchQuery.trim() === '') {
                this.searchableModList = [...(this.modifiableModList || [])];
            }
            const searchKeys = SearchUtils.makeKeys(this.searchQuery);
            this.searchableModList = this.modifiableModList.filter((x: ManifestV2) => {
                return SearchUtils.isSearched(searchKeys, x.getName(), x.getDescription());
            });
        }

        getThunderstoreModFromMod(mod: ManifestV2) {
            return ModBridge.getThunderstoreModFromMod(mod, this.thunderstorePackages);
        }

        async moveUp(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            const updatedList = await ProfileModList.shiftModEntryUp(mod, this.contextProfile!);
            if (updatedList instanceof R2Error) {
                this.$emit('error', updatedList);
                return;
            }
            await this.$store.dispatch("updateModList",updatedList);
            const err = await ConflictManagementProvider.instance.resolveConflicts(updatedList, this.contextProfile!);
            if (err instanceof R2Error) {
                this.$emit('error', err);
            }
            this.filterModList();
        }

        async moveDown(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            const updatedList = await ProfileModList.shiftModEntryDown(mod, this.contextProfile!);
            if (updatedList instanceof R2Error) {
                this.$emit('error', updatedList);
                return;
            }
            await this.$store.dispatch("updateModList", updatedList);
            const err = await ConflictManagementProvider.instance.resolveConflicts(updatedList, this.contextProfile!);
            if (err instanceof R2Error) {
                this.$emit('error', err);
            }
            this.filterModList();
        }

        isLatest(vueMod: any): boolean {
            return ModBridge.isLatestVersion(vueMod);
        }

        getMissingDependencies(vueMod: any): string[] {
            const mod: Mod = new Mod().fromReactive(vueMod);
            return mod.getDependencies().filter((dependency: string) => {
                // Include in filter if mod isn't found.
                return this.modifiableModList.find((localMod: ManifestV2) => dependency.toLowerCase().startsWith(localMod.getName().toLowerCase() + "-")) === undefined;
            });
        }

        getDependantList(mod: ManifestV2): Set<ManifestV2> {
            return Dependants.getDependantList(mod, this.modifiableModList);
        }

        getDependencyList(mod: ManifestV2): Set<ManifestV2> {
            return Dependants.getDependencyList(mod, this.modifiableModList);
        }

        async performUninstallMod(mod: ManifestV2): Promise<R2Error | void> {
            const uninstallError: R2Error | null = await ProfileInstallerProvider.instance.uninstallMod(mod, this.contextProfile!);
            if (uninstallError instanceof R2Error) {
                // Uninstall failed
                this.showingDependencyList = false;
                this.$emit('error', uninstallError);
                return uninstallError;
            }
            const modList: ManifestV2[] | R2Error = await ProfileModList.removeMod(mod, this.contextProfile!);
            if (modList instanceof R2Error) {
                // Failed to remove mod from local list.
                this.showingDependencyList = false;
                this.$emit('error', modList);
                return modList;
            }
            await this.$store.dispatch("updateModList",modList);
            const err = await ConflictManagementProvider.instance.resolveConflicts(modList, this.contextProfile!);
            if (err instanceof R2Error) {
                this.$emit('error', err);
            }
        }

        async disableMod(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            try {
                const result = await this.performDisable([...Dependants.getDependantList(mod, this.modifiableModList), mod]);
                if (result instanceof R2Error) {
                    this.$emit('error', result);
                    return;
                }
            } catch (e) {
                // Failed to disable mod.
                const err: Error = e as Error;
                this.$emit("error", err);
                LoggerProvider.instance.Log(LogSeverity.ACTION_STOPPED, `${err.name}\n-> ${err.message}`);
            }
            this.selectedManifestMod = null;
        }

        async performDisable(mods: ManifestV2[]): Promise<R2Error | void> {
            for (let mod of mods) {
                const disableErr: R2Error | void = await ProfileInstallerProvider.instance.disableMod(mod, this.contextProfile!);
                if (disableErr instanceof R2Error) {
                    // Failed to disable
                    this.showingDependencyList = false;
                    this.$emit('error', disableErr);
                    return disableErr;
                }
            }
            const updatedList = await ProfileModList.updateMods(mods, this.contextProfile!, (updatingMod: ManifestV2) => {
                updatingMod.disable();
            });
            if (updatedList instanceof R2Error) {
                // Failed to update mod list.
                this.showingDependencyList = false;
                this.$emit('error', updatedList);
                return updatedList;
            }
            await this.$store.dispatch("updateModList", updatedList);
            const err = await ConflictManagementProvider.instance.resolveConflicts(updatedList, this.contextProfile!);
            if (err instanceof R2Error) {
                this.$emit('error', err);
            }
            this.filterModList();
        }

        async uninstallMod(vueMod: any) {
            let mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            try {
                for (const dependant of Dependants.getDependantList(mod, this.modifiableModList)) {
                    const result = await this.performUninstallMod(dependant);
                    if (result instanceof R2Error) {
                        this.$emit('error', result);
                        return;
                    }
                }
                const result = await this.performUninstallMod(mod);
                if (result instanceof R2Error) {
                    this.$emit('error', result);
                    return;
                }
            } catch (e) {
                // Failed to uninstall mod.
                const err: Error = e as Error;
                this.$emit('error', err);
                LoggerProvider.instance.Log(LogSeverity.ACTION_STOPPED, `${err.name}\n-> ${err.message}`);
            }
            this.selectedManifestMod = null;
            const result: ManifestV2[] | R2Error = await ProfileModList.getModList(this.contextProfile!);
            if (result instanceof R2Error) {
                this.$emit('error', result);
                return;
            }
            await this.$store.dispatch("updateModList", result);
            const err = await ConflictManagementProvider.instance.resolveConflicts(result, this.contextProfile!);
            if (err instanceof R2Error) {
                this.$emit('error', err);
            }
            this.filterModList();
        }

        showDependencyList(vueMod: any, displayType: string) {
            this.selectedManifestMod = new ManifestV2().fromReactive(vueMod);
            this.dependencyListDisplayType = displayType;
            this.showingDependencyList = true;
            console.log(this.dependencyListDisplayType, this.showingDependencyList)
        }

        uninstallModRequireConfirmation(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            if (this.getDependantList(mod).size === 0) {
                this.performUninstallMod(mod);
                this.filterModList();
            } else {
                this.showDependencyList(mod, DependencyListDisplayType.UNINSTALL);
            }
        }

        disableModRequireConfirmation(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            const enabledDependants: ManifestV2[] = [];
            this.getDependantList(mod).forEach(value => {
               if (value.isEnabled()) {
                   enabledDependants.push(value);
               }
            });
            if (enabledDependants.length === 0) {
                this.performDisable([mod]);
            } else {
                this.showDependencyList(mod, DependencyListDisplayType.DISABLE);
            }
        }

        viewDependencyList(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            this.showDependencyList(mod, DependencyListDisplayType.VIEW);
        }

        async enableMod(vueMod: any) {
            const mod: ManifestV2 = new ManifestV2().fromReactive(vueMod);
            try {
                const result = await this.performEnable([...Dependants.getDependencyList(mod, this.modifiableModList), mod]);
                if (result instanceof R2Error) {
                    throw result;
                }
            } catch (e) {
                // Failed to disable mod.
                const err: Error = e as Error;
                this.$emit('error', err);
                LoggerProvider.instance.Log(LogSeverity.ACTION_STOPPED, `${err.name}\n-> ${err.message}`);
            }
        }

        async performEnable(mods: ManifestV2[]): Promise<R2Error | void> {
            for (let mod of mods) {
                const disableErr: R2Error | void = await ProfileInstallerProvider.instance.enableMod(mod, this.contextProfile!);
                if (disableErr instanceof R2Error) {
                    // Failed to disable
                    this.showingDependencyList = false;
                    this.$emit('error', disableErr);
                    return disableErr;
                }
            }
            const updatedList = await ProfileModList.updateMods(mods, this.contextProfile!, (updatingMod: ManifestV2) => {
                updatingMod.enable();
            });
            if (updatedList instanceof R2Error) {
                // Failed to update mod list.
                this.showingDependencyList = false;
                this.$emit('error', updatedList);
                return updatedList;
            }
            await this.$store.dispatch("updateModList",updatedList);
            const err = await ConflictManagementProvider.instance.resolveConflicts(updatedList, this.contextProfile!);
            if (err instanceof R2Error) {
                this.$emit('error', err);
            }
            this.filterModList();
        }

        updateMod(vueMod: any) {
            this.selectedManifestMod = new ManifestV2().fromReactive(vueMod);
            const mod = ModBridge.getThunderstoreModFromMod(
                this.selectedManifestMod,
                this.thunderstorePackages
            );
            if (mod instanceof ThunderstoreMod) {
                this.$store.commit("openDownloadModModal", mod);
            } else {
                this.$store.commit("closeDownloadModModal");
            }
        }

        downloadDependency(missingDependency: string) {
            const mod: ThunderstoreMod | undefined = this.thunderstorePackages.find(
                (tsMod: ThunderstoreMod) => missingDependency.toLowerCase().startsWith(tsMod.getFullName().toLowerCase() + "-")
            );
            if (mod === undefined) {
                this.$store.commit("closeDownloadModModal");
                const error = new R2Error(
                    `找不到 ${missingDependency}`,
                    '可能是网络故障，或者mod已从Thunderstore下架。',
                    '也可能依赖mod还没发布到Thunderstore或者可以在其他地方获取。'
                );
                this.$emit('error', error);
                return;
            }
            this.$store.commit("openDownloadModModal", mod);
        }

        getDeprecatedFilterOptions() {
            return Object.values(SortLocalDisabledMods);
        }

        getSortOrderOptions() {
            return Object.values(SortNaming);
        }

        getSortDirectionOptions() {
            return Object.values(SortDirection);
        }

        canShowSortIcons() {
            return this.sortDirection === SortDirection.STANDARD
                && this.sortOrder === SortNaming.CUSTOM
                && this.sortDisabledPosition === SortLocalDisabledMods.CUSTOM
                && this.searchQuery.length === 0;
        }

        getProfileName() {
            return this.contextProfile!.getProfileName();
        }

        async created() {
            this.activeGame = GameManager.activeGame;
            this.settings = await ManagerSettings.getSingleton(this.activeGame);
            this.contextProfile = Profile.getActiveProfile();
            this.filterModList();

            this.cardExpanded = this.settings.getContext().global.expandedCards;
            this.funkyMode = this.settings.getContext().global.funkyModeEnabled;
        }

        emitError(error: R2Error) {
            this.$emit('error', error);
        }

    }

</script>
