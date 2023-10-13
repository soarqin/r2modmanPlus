<template>
    <modal v-show="isOpen" :open="isOpen" :show-close="false">
        <template v-slot:title>
            <p class="card-header-title">mod分类过滤</p>
        </template>
        <template v-slot:body>
            <div class="input-group">
                <label>分类</label>
                <select class="select select--content-spacing" @change="selectCategory($event)">
                    <option selected disabled>
                        选择分类
                    </option>
                    <option v-for="(key, index) in unselectedCategories" :key="`category--${key}-${index}`">
                        {{ key }}
                    </option>
                </select>
            </div>
            <br/>
            <div class="input-group">
                <label>选择的分类:</label>
                <div class="field has-addons" v-if="selectedCategories.length > 0">
                    <div class="control" v-for="(key, index) in selectedCategories" :key="`${key}-${index}`">
                        <span class="block margin-right">
                            <a href="#" @click="unselectCategory(key)">
                                <span class="tags has-addons">
                                    <span class="tag">{{ key }}</span>
                                    <span class="tag is-danger">
                                        <i class="fas fa-times"></i>
                                    </span>
                                </span>
                            </a>
                        </span>
                    </div>
                </div>
                <div class="field has-addons" v-else>
                    <span class="tags">
                        <span class="tag">未选择分类</span>
                    </span>
                </div>
            </div>
            <hr/>
            <div>
                <div>
                    <input
                        v-model="allowNsfw"
                        id="nsfwCheckbox"
                        class="is-checkradio has-background-color"
                        type="checkbox"
                        :class="[{'is-dark': !isDarkTheme, 'is-white': isDarkTheme}]"
                    >
                    <label for="nsfwCheckbox">允许NSFW(可能裸露)mod</label>
                </div>
                <div>
                    <input
                        v-model="showDeprecatedPackages"
                        id="showDeprecatedCheckbox"
                        class="is-checkradio has-background-color"
                        type="checkbox"
                        :class="[{'is-dark': !isDarkTheme, 'is-white': isDarkTheme}]"
                    >
                    <label for="showDeprecatedCheckbox">显示弃用的mod</label>
                </div>
            </div>
            <br/>
            <div>
                <div v-for="(key, index) in categoryFilterValues" :key="`cat-filter-${key}-${index}`">
                    <input
                        name="categoryFilterCondition"
                        type="radio"
                        :id="`cat-filter-${key}-${index}`"
                        :value=key
                        :checked="index === 0 ? true : undefined" v-model="categoryFilterMode"
                    />
                    <label :for="`cat-filter-${key}-${index}`">
                        <span class="margin-right margin-right--half-width" />
                        {{ key }}
                    </label>
                </div>
            </div>
        </template>
        <template v-slot:footer>
            <button class="button is-info" @click="close">
                应用过滤器
            </button>
        </template>
    </modal>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import { Modal } from '../../components/all';
import CategoryFilterMode from '../../model/enums/CategoryFilterMode';
import GameManager from '../../model/game/GameManager';
import ManagerSettings from '../../r2mm/manager/ManagerSettings';

@Component({
    components: { Modal }
})
export default class CategoryFilterModal extends Vue {
    settings: ManagerSettings = new ManagerSettings();

    get allowNsfw(): boolean {
        return this.$store.state.modFilters.allowNsfw;
    }

    set allowNsfw(value: boolean) {
        this.$store.commit("modFilters/setAllowNsfw", value);
    }

    get categoryFilterMode(): CategoryFilterMode {
        return this.$store.state.modFilters.categoryFilterMode;
    }

    set categoryFilterMode(value: CategoryFilterMode) {
        this.$store.commit("modFilters/setCategoryFilterMode", value);
    }

    get categoryFilterValues() {
        return Object.values(CategoryFilterMode);
    }

    get showDeprecatedPackages(): boolean {
        return this.$store.state.modFilters.showDeprecatedPackages;
    }

    set showDeprecatedPackages(value: boolean) {
        this.$store.commit("modFilters/setShowDeprecatedPackages", value);
    }

    close() {
        this.$store.commit("closeCategoryFilterModal");
    }

    async created() {
        this.settings = await ManagerSettings.getSingleton(GameManager.activeGame);
    }

    get isDarkTheme(): boolean {
        return this.settings.getContext().global.darkTheme;
    }

    get isOpen(): boolean {
        return this.$store.state.modals.isCategoryFilterModalOpen;
    }

    selectCategory(event: Event) {
        if (!(event.target instanceof HTMLSelectElement)) {
            return;
        }

        this.$store.commit("modFilters/selectCategory", event.target.value);
        event.target.selectedIndex = 0;
    }

    get selectedCategories(): string[] {
        return this.$store.state.modFilters.selectedCategories;
    }

    unselectCategory(category: string) {
        this.$store.commit("modFilters/unselectCategory", category);
    }

    get unselectedCategories(): string[] {
        return this.$store.getters["modFilters/unselectedCategories"];
    }
}
</script>
