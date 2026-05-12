// 可搜索下拉框组件
(function() {
    window.SearchableSelect = function(options) {
        this.options = options.options || [];
        this.placeholder = options.placeholder || '请选择或输入搜索...';
        this.value = options.value || '';
        this.onChange = options.onChange || function() {};
        this.container = null;
        this.input = null;
        this.hiddenInput = null;
        this.dropdown = null;
        this.filteredOptions = [];
        this.selectedIndex = -1;
    };

    SearchableSelect.prototype.render = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return this;

        this.container = container;
        const inputName = container.dataset.name || '';
        container.className = 'searchable-select';
        container.innerHTML = '';

        // 创建输入框
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'searchable-input';
        this.input.placeholder = this.placeholder;
        this.input.autocomplete = 'off';

        // 创建隐藏字段存储实际值（用于表单提交）
        this.hiddenInput = document.createElement('input');
        this.hiddenInput.type = 'hidden';
        this.hiddenInput.name = inputName;
        this.hiddenInput.value = this.value;

        // 创建下拉箭头
        const arrow = document.createElement('span');
        arrow.className = 'searchable-arrow';
        arrow.innerHTML = '&#9662;';

        // 创建下拉列表
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'searchable-dropdown';

        container.appendChild(this.input);
        container.appendChild(this.hiddenInput);
        container.appendChild(arrow);
        container.appendChild(this.dropdown);

        // 绑定事件
        this.bindEvents();

        // 设置初始显示值
        const selected = this.options.find(o => o.value === this.value);
        if (selected) {
            this.input.value = selected.label;
        }

        return this;
    };

    SearchableSelect.prototype.bindEvents = function() {
        const self = this;

        this.input.addEventListener('focus', function() {
            self.showDropdown();
        });

        this.input.addEventListener('input', function() {
            self.filterOptions(this.value);
            self.showDropdown();
        });

        this.input.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                self.selectedIndex = Math.min(self.selectedIndex + 1, self.filteredOptions.length - 1);
                self.highlightOption();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                self.selectedIndex = Math.max(self.selectedIndex - 1, -1);
                self.highlightOption();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (self.selectedIndex >= 0 && self.filteredOptions[self.selectedIndex]) {
                    self.selectOption(self.filteredOptions[self.selectedIndex]);
                } else {
                    self.setValue(self.input.value, self.input.value);
                    self.hideDropdown();
                }
            } else if (e.key === 'Escape') {
                self.hideDropdown();
            }
        });

        this.container.addEventListener('click', function(e) {
            if (e.target.classList.contains('searchable-arrow')) {
                self.input.focus();
                if (self.dropdown.style.display === 'block') {
                    self.hideDropdown();
                } else {
                    self.showDropdown();
                }
            }
        });

        // 点击外部关闭
        document.addEventListener('click', function(e) {
            if (!self.container.contains(e.target)) {
                self.hideDropdown();
                // 如果输入的值不在选项中，允许保留为自定义值
                if (self.input.value && !self.options.some(o => o.label === self.input.value)) {
                    self.setValue(self.input.value, self.input.value);
                }
            }
        });
    };

    SearchableSelect.prototype.showDropdown = function() {
        this.filterOptions(this.input.value);
        this.dropdown.style.display = 'block';
    };

    SearchableSelect.prototype.hideDropdown = function() {
        this.dropdown.style.display = 'none';
        this.selectedIndex = -1;
    };

    SearchableSelect.prototype.filterOptions = function(query) {
        query = (query || '').toLowerCase().trim();
        if (!query) {
            this.filteredOptions = [...this.options];
        } else {
            this.filteredOptions = this.options.filter(o => o.label.toLowerCase().includes(query));
        }
        this.selectedIndex = -1;
        this.renderOptions();
    };

    SearchableSelect.prototype.renderOptions = function() {
        const self = this;
        this.dropdown.innerHTML = '';

        if (this.filteredOptions.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'searchable-empty';
            emptyDiv.textContent = '无匹配选项（按回车使用当前输入）';
            this.dropdown.appendChild(emptyDiv);
            return;
        }

        this.filteredOptions.forEach((opt, index) => {
            const div = document.createElement('div');
            div.className = 'searchable-option';
            div.textContent = opt.label;
            div.dataset.value = opt.value;
            div.dataset.index = index;
            div.addEventListener('click', function(e) {
                e.stopPropagation();
                self.selectOption(opt);
            });
            this.dropdown.appendChild(div);
        });
    };

    SearchableSelect.prototype.highlightOption = function() {
        const items = this.dropdown.querySelectorAll('.searchable-option');
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === this.selectedIndex);
            if (i === this.selectedIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    };

    SearchableSelect.prototype.selectOption = function(opt) {
        this.input.value = opt.label;
        this.hiddenInput.value = opt.value;
        this.value = opt.value;
        this.onChange(opt.value, opt.label);
        this.hideDropdown();
    };

    SearchableSelect.prototype.setValue = function(value, label) {
        this.value = value;
        if (this.hiddenInput) this.hiddenInput.value = value;
        if (this.input) this.input.value = label || value;
    };

    SearchableSelect.prototype.setOptions = function(options) {
        this.options = options;
        if (this.input) {
            this.filterOptions(this.input.value);
        }
    };
})();
