import * as React from 'react';
import { IFieldProps } from './Field';
//import { validate } from '@babel/types';

interface IFormProps {
    //the http path to which the form will be posted
    action: string

    /* The props for all the fields on the form */
    fields: IFields;

    /* A prop which allows content to be injected */
    render: () => React.ReactNode
}

export interface IFields {
    [key: string]: IFieldProps
}

export interface IValues {
    /* Key value pairs for all the field values with key being the field name */
    [key: string]: string;
}

export interface IErrors {
    /* The validation error messages for each field (key) is the field name */
    [key: string]: string;
}

export interface IFormState {
    /* The field values */
    values: IValues;

    /* The field validation error messages */
    errors: IErrors;

    /*Reference id for testing */
    refrenceId: number;

    /* Whether the form has been successfully submitted */
    submitSuccess?: boolean;
}

export interface IFormContext extends IFormState {
    /* Function that allows values in the values state to be set */
    setValues: (values: IValues) => void;

    /* Function that validates a field */
    validate: (fieldName: string) => void;
}

/* 
 * The context which allows state and functions to be shared with Field.
 * Note that we need to pass createContext a default value which is why undefined is unioned in the type
 */
export const FormContext = React.createContext<IFormContext | undefined>(undefined);

/**
 * Validates whether a field has a value
 * @param {IValues} values - All the field values in the form
 * @param {string} fieldName - The field to validate
 * @returns {string} - The error message
 */
export const required = (values: IValues, fieldName: string): string =>
    values[fieldName] === undefined ||
        values[fieldName] === null ||
        values[fieldName] === ""
        ? "This must be populated"
        : "";

/**
 * Validates whether a field is a valid email
 * @param {IValues} values - All the field values in the form
 * @param {string} fieldName - The field to validate
 * @returns {string} - The error message
 */
export const isEmail = (values: IValues, fieldName: string): string =>
    values[fieldName] &&
        values[fieldName].search(
            /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
        )
        ? "This must be in a valid email format"
        : "";

/**
 * Validates whether a field is within a certain amount of characters
 * @param {IValues} values - All the field values in the form
 * @param {string} fieldName - The field to validate
 * @param {number} length - The maximum number of characters
 * @returns {string} - The error message
 */
export const maxLength = (
    values: IValues,
    fieldName: string,
    length: number
): string =>
    values[fieldName] && values[fieldName].length > length
        ? `This can not exceed ${length} characters`
        : "";

export class Form extends React.Component<IFormProps, IFormState>{
    constructor(props: IFormProps) {
        super(props);

        const errors: IErrors = {};
        const values: IValues = {};
        const refrenceId: number = 0;

        this.state = {
            errors,
            values,
            refrenceId
        };
    }

    /**
     * Stores new field values in state
     * @param {IValues} values - The new field values
     */
    private setValues = (values: IValues) => {
        this.setState({ values: { ...this.state.values, ...values } });
    };

    /**
     * Returns whether there are any errors in the errors object that is passed in
     * @param {IErrors} errors - The field errors
     * @returns {boolean} - Whether there are any errors
     */
    private haveErrors(errors: IErrors) {
        for (let [value] of Object.entries(errors))
            if (value)  // <---- if (value) alone is enough as an empty string '' is falsy
                return true;
        return false;
    }

    /**
     * Executes the validation rule for the field and updates the form errors
     * @param {string} fieldName - The field to validate
     * @returns {string} - The error message
     */
    private validate = (fieldName: string): string => {
        let newError: string = "";

        if (
            this.props.fields[fieldName] &&
            this.props.fields[fieldName].validation
        ) {
            newError = this.props.fields[fieldName].validation!.rule(
                this.state.values,
                fieldName,
                this.props.fields[fieldName].validation!.args
            );
        }
        this.state.errors[fieldName] = newError;
        this.setState({
            errors: { ...this.state.errors, [fieldName]: newError }
        });
        return newError;
    };

    /**
     * Handles form submission
     * @param {React.FormEvent<HTMLFormElement>} e - The form event
     */
    private handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> => {
        e.preventDefault();
        debugger
        console.log(this.state.values);

        if (this.validateForm()) {
            const submitSuccess: boolean = await this.submitForm();
            this.setState({
                submitSuccess: submitSuccess,
                refrenceId: 4567
            });
        }
    }

    /**
     * Executes the validation rules for all the fields on the form and sets the error state
     * @returns {boolean} - Returns true if the form is valid
     */
    private validateForm(): boolean {
        const errors: IErrors = {};
        Object.keys(this.props.fields).map((fieldName: string) => {
            return errors[fieldName] = this.validate(fieldName);
        });
        this.setState({ errors });
        return !this.haveErrors(errors);
    }

    /* Submits the form to the http api
    * @returns {boolean} - Whether the form submission was successful or not
    */
    private async submitForm(): Promise<boolean> {
        try {
            const response = await fetch(this.props.action, {
                method: "post",
                headers: new Headers({
                    "Content-Type": "application/json",
                    Accept: "application/json"
                }),
                body: JSON.stringify(this.state.values)
            });

            if (response.status === 400) {
                /* Map the validation errors to IErrors */
                let responseBody: any = await response.json();
                const errors: IErrors = {};
                Object.keys(responseBody).map((key) => {
                    const fieldName = key;
                    return errors[fieldName] = responseBody[key];
                });
                this.setState({ errors });
            }
            return response.ok;
        } catch (ex) {
            return false;
        }
    }

    public render() {
        const { submitSuccess, errors, refrenceId } = this.state;
        const context: IFormContext = {
            ...this.state,
            setValues: this.setValues,
            validate: this.validate
        };

        return (
            <FormContext.Provider value={context}>
                <form onSubmit={this.handleSubmit} noValidate={true}>
                    <div className='container'>
                        {/* render fields */}
                        {this.props.render()}

                        <div className='form-group'>
                            <button type='submit' className='btn btn-primary'
                                disabled={this.haveErrors(errors)}>
                                Submit
                        </button>
                        </div>
                        {submitSuccess && (
                            <div className='alert alert-info' role='alert'>
                                The form was succefully submitted! Your refrenceId is {refrenceId}
                            </div>)}

                        {submitSuccess === false && this.haveErrors(errors) === false && (
                            <div className='alert alert-danger' role='alert'>
                                Sorry, an unexpected error has occurred
                            </div>
                        )}

                        {submitSuccess === false && this.haveErrors(errors) === true && (
                            <div className="alert alert-danger" role="alert">
                                Sorry, the form is invalid. Please review, adjust and try again
                      </div>
                        )}


                    </div>
                </form>
            </FormContext.Provider>
        );
    }
}