<template>
    <div>
        <Modal :show-close="true" @close-modal="emitClose" :open="visible">
            <template slot="title">
                <p class='card-header-title'>从文件导入mod</p>
            </template>
            <template slot="footer" v-if="fileToImport === null">
                <button class="button is-info" @click="selectFile">选择文件</button>
            </template>
            <template slot="footer" v-else-if="fileToImport !== null">
                <button class="button is-info" @click="importFile">导入本地mod</button>
            </template>

            <template slot="body" v-if="fileToImport === null">
                <template v-if="!waitingForSelection">
                    <p>请选择要导入的zip或DLL。</p>
                    <p>包含manifest的Zip文件将会自动填入一些mod信息，否则需要全部手动输入。</p>
                </template>
                <template v-else>
                    <p>等待文件选择。</p>
                </template>
            </template>

            <template slot="body" v-if="fileToImport !== null">
                <div class="notification is-warning" v-if="validationMessage !== null">
                    <p>{{ validationMessage }}</p>
                </div>
                <div class="input-group input-group--flex margin-right">
                    <label for="mod-name" class="non-selectable">Mod名</label>
                    <input id="mod-name" ref="mod-name" class="input margin-right" type="text" v-model="modName" placeholder="输入Mod名"/>
                </div>
                <br/>
                <div class="input-group input-group--flex margin-right">
                    <label for="mod-author" class="non-selectable">作者</label>
                    <input id="mod-author" ref="mod-author" class="input margin-right" type="text" v-model="modAuthor" placeholder="输入作者名"/>
                </div>
                <br/>
                <div class="input-group input-group--flex margin-right">
                    <label for="mod-author" class="non-selectable">描述 (可选)</label>
                    <input id="mod-description" ref="mod-description" class="input margin-right" type="text" v-model="modDescription" placeholder="输入描述"/>
                </div>
                <hr/>
                <h3 class="title is-6">版本</h3>
                <div class="input-group input-group--flex margin-right non-selectable">
                    <div class="is-flex">
                        <div class="margin-right margin-right--half-width">
                            <label for="mod-version-major">Major</label>
                            <input id="mod-version-major" ref="mod-version" class="input margin-right" type="number" v-model="modVersionMajor" min="0" step="1" placeholder="0"/>
                        </div>
                        <div class="margin-right margin-right--half-width">
                            <label for="mod-version-minor">Minor</label>
                            <input id="mod-version-minor" ref="mod-version" class="input margin-right" type="number" v-model="modVersionMinor" min="0" step="1" placeholder="0"/>
                        </div>
                        <div>
                            <label for="mod-version-patch">Patch</label>
                            <input id="mod-version-patch" ref="mod-version" class="input margin-right" type="number" v-model="modVersionPatch" min="0" step="1" placeholder="0"/>
                        </div>
                    </div>
                </div>
            </template>
        </Modal>
    </div>
</template>

<script lang="ts">

import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import InteractionProvider from '../../providers/ror2/system/InteractionProvider';
import Modal from '../Modal.vue';
import * as path from 'path';
import VersionNumber from '../../model/VersionNumber';
import ZipProvider from '../../providers/generic/zip/ZipProvider';
import ManifestV2 from '../../model/ManifestV2';
import R2Error from '../../model/errors/R2Error';
import Profile from '../../model/Profile';
import ProfileModList from '../../r2mm/mods/ProfileModList';
import LocalModInstallerProvider from '../../providers/ror2/installing/LocalModInstallerProvider';

@Component({
    components: { Modal }
})
export default class LocalFileImportModal extends Vue {

    @Prop({default: false, type: Boolean})
    private visible!: boolean;

    private fileToImport: string | null = null;
    private waitingForSelection: boolean = false;
    private validationMessage: string | null = null;

    private modName = "";
    private modAuthor = "Unknown";
    private modDescription = "";
    private modVersionMajor = 0;
    private modVersionMinor = 0;
    private modVersionPatch = 0;

    private resultingManifest = new ManifestV2();

    @Watch("visible")
    private visiblityChanged() {
        this.fileToImport = null;
        this.waitingForSelection = false;
        this.validationMessage = null;
    }

    private async selectFile() {
        this.waitingForSelection = true;
        InteractionProvider.instance.selectFile({
            buttonLabel: "选择文件",
            title: "从文件导入本地mod",
            filters: []
        }).then(value => {
            if (value.length > 0) {
                this.fileToImport = value[0];
                this.assumeDefaults();
            } else {
                this.waitingForSelection = false;
                this.fileToImport = null;
            }
        })
    }

    private async assumeDefaults() {

        this.modName = "";
        this.modAuthor = "Unknown";
        this.modDescription = "";
        this.modVersionMajor = 0;
        this.modVersionMinor = 0;
        this.modVersionPatch = 0;

        this.resultingManifest = new ManifestV2();

        if (this.fileToImport === null) { return }

        if (this.fileToImport.endsWith(".zip")) {
            const entries = await ZipProvider.instance.getEntries(this.fileToImport);
            if (entries.filter(value => value.entryName === "manifest.json").length === 1) {
                const manifestContents = await ZipProvider.instance.readFile(this.fileToImport, "manifest.json");
                if (manifestContents !== null) {
                    const manifestJson: any = JSON.parse(manifestContents.toString().trim());
                    const manifestOrErr = new ManifestV2().makeSafeFromPartial(manifestJson);
                    if (manifestOrErr instanceof R2Error) {
                        // Assume V1. Allow user to correct anything incorrect in case manifest is not Thunderstore valid.
                        this.modName = manifestJson.name || "";
                        this.modDescription = manifestJson.description || "";
                        const modVersion = new VersionNumber(manifestJson.version_number || "").toString().split(".");
                        this.modVersionMajor = Number(modVersion[0]);
                        this.modVersionMinor = Number(modVersion[1]);
                        this.modVersionPatch = Number(modVersion[2]);
                        const inferred = this.inferFieldValuesFromFile(this.fileToImport);
                        this.modAuthor = inferred.modAuthor;
                        this.resultingManifest.setDependencies(manifestJson.dependencies || []);
                        return;
                    } else {
                        this.resultingManifest = manifestOrErr;
                        this.modName = manifestOrErr.getDisplayName();
                        this.modAuthor = manifestOrErr.getAuthorName();
                        this.modDescription = manifestOrErr.getDescription();
                        const modVersion = manifestOrErr.getVersionNumber().toString().split(".");
                        this.modVersionMajor = Number(modVersion[0]);
                        this.modVersionMinor = Number(modVersion[1]);
                        this.modVersionPatch = Number(modVersion[2]);
                        // TODO: Make fields readonly if V2 is provided.
                        return;
                    }
                }
            } else {
                console.log("不包含manifest");
            }
        }

        const inferred = this.inferFieldValuesFromFile(this.fileToImport);

        this.modName = inferred.modName
        this.modAuthor = inferred.modAuthor;
        this.modVersionMajor = inferred.modVersionMajor;
        this.modVersionMinor = inferred.modVersionMinor;
        this.modVersionPatch = inferred.modVersionPatch;
    }

    private inferFieldValuesFromFile(file: string): ImportFieldAttributes {
        const fileSafe = file.split("\\").join("/");
        const fileName = path.basename(fileSafe, path.extname(fileSafe));
        const hyphenSeparated = fileName.split("-");
        const underscoreSeparated = fileName.split("_");

        const data: ImportFieldAttributes = {
            modName: "",
            modAuthor: "Unknown",
            modVersionMajor: 0,
            modVersionMinor: 0,
            modVersionPatch: 0,
        }

        if (hyphenSeparated.length === 3) {
            data.modAuthor = hyphenSeparated[0];
            data.modName = hyphenSeparated[1];
            const modVersion = this.santizeVersionNumber(hyphenSeparated[2]).toString().split(".");
            data.modVersionMajor = Number(modVersion[0]);
            data.modVersionMinor = Number(modVersion[1]);
            data.modVersionPatch = Number(modVersion[2]);
        } else if (hyphenSeparated.length === 2) {
            data.modName = hyphenSeparated[0];
            const modVersion = this.santizeVersionNumber(hyphenSeparated[1]).toString().split(".");
            data.modVersionMajor = Number(modVersion[0]);
            data.modVersionMinor = Number(modVersion[1]);
            data.modVersionPatch = Number(modVersion[2]);
        } else if (underscoreSeparated.length === 3) {
            data.modAuthor = underscoreSeparated[0];
            data.modName = underscoreSeparated[1];
            const modVersion = this.santizeVersionNumber(underscoreSeparated[2]).toString().split(".");
            data.modVersionMajor = Number(modVersion[0]);
            data.modVersionMinor = Number(modVersion[1]);
            data.modVersionPatch = Number(modVersion[2]);
        } else if (underscoreSeparated.length === 2) {
            data.modName = underscoreSeparated[0];
            const modVersion = this.santizeVersionNumber(underscoreSeparated[1]).toString().split(".");
            data.modVersionMajor = Number(modVersion[0]);
            data.modVersionMinor = Number(modVersion[1]);
            data.modVersionPatch = Number(modVersion[2]);
        } else {
            data.modName = fileName;
        }

        return data;
    }

    private santizeVersionNumber(vn: string): VersionNumber {
        const modVersionSplit = vn.split(".");
        const modVersionString = `${this.versionPartToNumber(modVersionSplit[0])}.${this.versionPartToNumber(modVersionSplit[1])}.${this.versionPartToNumber(modVersionSplit[2])}`;
        return new VersionNumber(modVersionString);
    }

    private versionPartToNumber(input: string | undefined) {
        return (input || "0").split(new RegExp("[^0-9]+"))
            .filter(value => value.trim().length > 0)
            .shift() || "0";
    }

    private emitClose() {
        this.$emit("close-modal");
    }

    private importFile() {
        if (this.fileToImport === null) {
            return;
        }

        switch (0) {
            case this.modName.trim().length:
                this.validationMessage = "mod名不能为空。";
                return;
            case this.modAuthor.trim().length:
                this.validationMessage = "mod作者不能为空。";
                return;
        }

        switch (NaN) {
            case Number(this.modVersionMajor):
            case Number(this.modVersionMinor):
            case Number(this.modVersionPatch):
                this.validationMessage = "major, minor和patch必须均为数字。";
                return;
        }

        if (this.modVersionMajor < 0) {
            this.validationMessage = "major不能小于0。";
            return;
        }
        if (this.modVersionMinor < 0) {
            this.validationMessage = "minor不能小于0。";
            return;
        }
        if (this.modVersionPatch < 0) {
            this.validationMessage = "patch不能小于0。";
            return;
        }

        const profile: Profile|null = this.$store.state.profile.activeProfile;

        if (profile === null) {
            this.validationMessage = "Profile is not selected";
            return;
        }

        this.resultingManifest.setName(`${this.modAuthor.trim()}-${this.modName.trim()}`);
        this.resultingManifest.setDisplayName(this.modName.trim());
        this.resultingManifest.setVersionNumber(new VersionNumber(`${this.modVersionMajor}.${this.modVersionMinor}.${this.modVersionPatch}`));
        this.resultingManifest.setDescription(this.modDescription.trim());
        this.resultingManifest.setAuthorName(this.modAuthor.trim());

        const installCallback = (async (success: boolean, error: any | null) => {
            if (!success && error !== null) {
                this.$store.commit("error/handleError", R2Error.fromThrownValue(error));
                return;
            }
            const updatedModListResult = await ProfileModList.getModList(profile);
            if (updatedModListResult instanceof R2Error) {
                this.$store.commit("error/handleError", updatedModListResult);
                return;
            }
            await this.$store.dispatch("profile/updateModList", updatedModListResult);
            this.emitClose();
        });

        if (this.fileToImport.endsWith(".zip")) {
            LocalModInstallerProvider.instance.extractToCacheWithManifestData(profile, this.fileToImport, this.resultingManifest, installCallback);
        } else {
            LocalModInstallerProvider.instance.placeFileInCache(profile, this.fileToImport, this.resultingManifest, installCallback);
        }
    }

}

interface ImportFieldAttributes {
    modName: string;
    modAuthor: string;
    modVersionMajor: number;
    modVersionMinor: number;
    modVersionPatch: number;
}
</script>
