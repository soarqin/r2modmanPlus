<script lang="ts">
import { Vue, Component, Ref, Watch } from 'vue-property-decorator';
import { ModalCard } from "../all";
import sanitize from 'sanitize-filename';
import R2Error from "../../model/errors/R2Error";
import Profile from "../../model/Profile";

@Component({
    components: {ModalCard}
})
export default class RenameProfileModal extends Vue {
    @Ref() readonly nameInput: HTMLInputElement | undefined;
    private newProfileName: string = '';

    @Watch('$store.state.profile.activeProfile')
    activeProfileChanged(newProfile: Profile, oldProfile: Profile|null) {
        if (
            // Modal was just created and has no value yet, use any available.
            this.newProfileName === "" ||
            // Profile was not previously selected, use the new active profile.
            oldProfile === null ||
            // Avoid losing user's changes when the profile unexpectedly changes.
            oldProfile.getProfileName() === this.newProfileName
        ) {
            this.newProfileName = newProfile.getProfileName();
        }
    }

    get isOpen(): boolean {
        const isOpen_ = this.$store.state.modals.isRenameProfileModalOpen;

        if (isOpen_) {
            this.$nextTick(() => {
                if (this.nameInput) {
                    this.nameInput.focus();
                }
            });
        }

        return isOpen_;
    }

    get profileList(): string[] {
        return this.$store.state.profiles.profileList;
    }

    closeModal() {
        this.newProfileName = this.$store.state.profile.activeProfile.getProfileName();
        this.$store.commit('closeRenameProfileModal');
    }

    makeProfileNameSafe(nameToSanitize: string): string {
        return sanitize(nameToSanitize);
    }

    doesProfileExist(nameToCheck: string): boolean {
        if ((nameToCheck.match(new RegExp('^([a-zA-Z0-9])(\\s|[a-zA-Z0-9]|_|-|[.])*$'))) === null) {
            return true;
        }
        const safe: string = this.makeProfileNameSafe(nameToCheck);
        return (this.profileList.some(function (profile: string) {
            return profile.toLowerCase() === safe.toLowerCase()
        }));
    }

    async performRename() {
        try {
            await this.$store.dispatch('profiles/renameProfile', {newName: this.newProfileName});
        } catch (e) {
            const err = R2Error.fromThrownValue(e, '用户配置改名时发生错误');
            this.$store.commit('error/handleError', err);
        }
        this.closeModal();
    }
}

</script>
<template>
    <ModalCard v-if="isOpen" :is-active="isOpen" @close-modal="closeModal">

        <template v-slot:header>
            <p class="modal-card-title">用户配置改名</p>
        </template>
        <template v-slot:body>
            <p>用户配置之间保存的数据相互独立。</p>

            <input
                class="input"
                v-model="newProfileName"
                @keyup.enter="!doesProfileExist(newProfileName) && performRename(newProfileName)"
                ref="nameInput"
            />

            <span class="tag is-dark" v-if="newProfileName === '' || makeProfileNameSafe(newProfileName) === ''">
                请输入用户配置名称
            </span>
            <span class="tag is-success" v-else-if="!doesProfileExist(newProfileName)">
                "{{makeProfileNameSafe(newProfileName)}}" 可用
            </span>
            <span class="tag is-danger" v-else-if="doesProfileExist(newProfileName)">
                "{{makeProfileNameSafe(newProfileName)}}" 已存在，或者包含非法字符
            </span>
        </template>
        <template v-slot:footer>
            <button class="button is-danger" v-if="doesProfileExist(newProfileName)" disabled>改名</button>
            <button class="button is-info" @click="performRename(newProfileName)" v-else>改名</button>
        </template>

    </ModalCard>
</template>
