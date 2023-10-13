<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { ModalCard } from "../all";
import R2Error from "../../model/errors/R2Error";

@Component({
    components: {ModalCard}
})
export default class DeleteProfileModal extends Vue {
    get isOpen(): boolean {
        return this.$store.state.modals.isDeleteProfileModalOpen;
    }

    get profileList(): string[] {
        return this.$store.state.profiles.profileList;
    }

    closeDeleteProfileModal() {
        this.$store.commit('closeDeleteProfileModal');
    }

    async removeProfile() {
        try {
            await this.$store.dispatch('profiles/removeSelectedProfile');
        } catch (e) {
            const err = R2Error.fromThrownValue(e, '删除用户配置时发生错误');
            this.$store.commit('error/handleError', err);
        }
        this.closeDeleteProfileModal();
    }
}

</script>
<template>
    <ModalCard v-if="isOpen" :is-active="isOpen" @close-modal="closeDeleteProfileModal">

        <template v-slot:header>
            <p class="modal-card-title">Delete profile</p>
        </template>
        <template v-slot:body>
            <p>这将移除用户配置内所有安装的mod以及他们的配置文件。</p>
            <p>如果这是误操作，请点击灰暗区域，或者右上角的×关闭。</p>
            <p>你确定要删除这个用户配置吗？</p>
        </template>
        <template v-slot:footer>
            <button
                class="button is-danger"
                @click="removeProfile()"
            >删除用户配置</button>
        </template>

    </ModalCard>
</template>
