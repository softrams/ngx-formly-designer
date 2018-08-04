import { Component, forwardRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FieldsService } from '../fields.service';
import { Subscription, timer } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { clone, cloneDeep, isObject } from 'lodash-es';

const WRAPPER_EDITOR_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => WrapperEditorComponent),
    multi: true
};

@Component({
    selector: 'formly-designer-wrapper-editor',
    template: `
        <form [formGroup]="fieldForm" novalidate>
            <div class="card">
                <div class="card-body">
                    <formly-form [form]="fieldForm" [fields]="fields" [model]="field">
                    </formly-form>
                    <ng-content></ng-content>
                </div>
            </div>
        </form>
    `,
    providers: [
        WRAPPER_EDITOR_CONTROL_VALUE_ACCESSOR
    ]
})
export class WrapperEditorComponent implements ControlValueAccessor, OnChanges, OnDestroy, OnInit {
    @Input() wrapper: string;

    private readonly subscriptions: Subscription[] = [];
    private valueChangesSubscription: Subscription;

    constructor(
        private fieldsService: FieldsService,
        private formBuilder: FormBuilder
    ) {
        this.fieldForm = formBuilder.group({});
    }

    invalid: boolean;
    fieldForm: FormGroup;
    field: FormlyFieldConfig;
    fields: FormlyFieldConfig[] = [];

    protected onChange = (value: any) => { };
    protected onTouched = () => { };

    ngOnInit(): void {
        this.subscriptions.push(this.fieldForm.statusChanges
            .pipe(switchMap(() => timer()))
            .subscribe(() => this.invalid = this.fieldForm.invalid));

        this.subscribeValueChanges();
    }

    ngOnDestroy(): void {
        this.valueChangesSubscription.unsubscribe();
        this.subscriptions.splice(0).forEach(subscription => subscription.unsubscribe());
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.wrapper) {
            if (this.valueChangesSubscription) {
                this.valueChangesSubscription.unsubscribe();
            }
            this.fields = this.fieldsService.getWrapperFields(this.wrapper);
            this.fieldForm = this.formBuilder.group({});
            this.field = clone(this.field);
            if (this.valueChangesSubscription) {
                this.subscribeValueChanges();
            }
        }
    }

    writeValue(obj: any) {
        this.valueChangesSubscription.unsubscribe();
        if (!isObject(obj)) {
            obj = {};
        }
        this.fields = this.fieldsService.getWrapperFields(this.wrapper);
        this.fieldForm = this.formBuilder.group({});
        this.field = cloneDeep(obj);
        this.subscribeValueChanges();
    }

    registerOnChange(fn: any) {
        this.onChange = fn;
    }

    registerOnTouched(fn: any) {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.fieldForm.disable();
        } else {
            this.fieldForm.enable();
        }
    }

    private subscribeValueChanges(): void {
        this.valueChangesSubscription = this.fieldForm.valueChanges
            .pipe(debounceTime(0))
            .subscribe(() => this.updateValue());
    }

    private updateValue(): void {
        if (!this.onChange) {
            return;
        }

        this.onChange(this.field);
    }
}
