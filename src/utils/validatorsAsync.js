import i18n from '@dhis2/d2-i18n';
import _ from '../constants/lodash';
import api from '../api';
import { USER, USER_GROUP } from '../constants/entityTypes';
import { USER_ATTRIBUTE_FIELD_PREFIX } from './attributeFieldHelpers';
import { USERNAME, FORM_NAME as USER_FORM } from '../containers/UserForm/config';
import { CODE, NAME, FORM_NAME as GROUP_FORM } from '../containers/GroupForm/config';
import { FORM_NAME as REPLICATE_USER_FORM } from '../components/ReplicateUserForm';
import createHumanErrorMessage from './createHumanErrorMessage';

export function asyncValidatorSwitch(values, _, props, blurredField) {
    // Skip aSync validation when submitting the form because all fields have been
    // validated on blur anyway, and the server will reject them
    if (!blurredField) {
        return Promise.resolve({});
    }

    if (props.form === USER_FORM && blurredField === USERNAME) {
        return asyncValidateUsername(values, _, props);
    }

    if (props.form === GROUP_FORM && (blurredField === CODE || blurredField === NAME)) {
        return asyncValidateUniqueness(values, _, props);
    }

    return asyncValidateAttributeUniqueness(values, _, props, blurredField);
}

export async function asyncValidateUsername(values, _, props) {
    const newUserName = values[USERNAME];
    const editingExistingUser =
        props.form !== REPLICATE_USER_FORM && props.user && props.user.id;

    if (!newUserName || editingExistingUser) {
        return Promise.resolve();
    }

    const errors = {};

    try {
        const modelCollection = await api.genericFind(
            'users',
            'userCredentials.username',
            newUserName
        );
        if (modelCollection.size > 0) {
            errors[USERNAME] = i18n.t('Username already taken');
        }
        return errors;
    } catch (error) {
        errors[USERNAME] = i18n.t(
            'There was a problem whilst checking the availability of this username'
        );
        throw errors;
    }
}

/**
 * Calls the genericFind method of the Api instance to find out whether a userRole/userGroup model instance with the same property value exists
 * @param {Object} values - redux form values object
 * @param {Object} _dispatch - store.dispatch method - ignored
 * @param {Object} props - Component properties, containing either a userRole or userGroup model
 * @param {Object} fieldName - The property name to check on uniqueness
 * @returns {Object} errors - Will be empty of the entry was unique. Otherwise will contain error message  for duplicate property values.
 * @memberof module:utils
 * @function
 */

export async function asyncValidateUniqueness(values, _dispatch, props, fieldName) {
    let errors = {};
    let validationPromises = [];
    const { validExceptSubmit, asyncBlurFields, group, role } = props;
    const model = role || group;

    // BEWARE!!!! Under certain conditions reduxForm.asyncValidate can be called
    // with param fieldName === undefined. If this happens you can assume everything
    // needs to be validated, so just loop through all fields
    if (validExceptSubmit && !fieldName && asyncBlurFields && asyncBlurFields.length) {
        asyncBlurFields.forEach(blurField => {
            validationPromises.push(asyncValidateField(blurField, values, errors, model));
        });
    } else {
        validationPromises.push(asyncValidateField(fieldName, values, errors, model));
    }

    await Promise.all(validationPromises);
    return errors;
}

async function asyncValidateAttributeUniqueness(values, _, props, blurredField) {
    const errors = {};
    const entityType = props.form === USER_FORM ? USER : USER_GROUP;
    const id = entityType === USER ? props.user.id || '_' : props.group.id || '_';
    const attributeId = blurredField.replace(USER_ATTRIBUTE_FIELD_PREFIX, '');
    const value = values[blurredField];

    try {
        const isUnique = await api.isAttributeUnique(entityType, id, attributeId, value);
        if (!isUnique) {
            errors[blurredField] = i18n.t(
                'Attribute value needs to be unique, value already taken.'
            );
        }
        return errors;
    } catch (error) {
        console.error(error);
        errors[blurredField] = i18n.t(
            'There was a problem checking if this attribute value is unique'
        );
        throw errors;
    }
}

const asyncValidateField = async (fieldName, values, errors, model) => {
    const entityName = model.modelDefinition.name;
    const fieldValue = values[fieldName];
    const fieldDisplayName = _.capitalize(fieldName);

    if (!fieldValue) {
        return Promise.resolve(errors);
    }

    try {
        const modelCollection = await api.genericFind(entityName, fieldName, fieldValue);
        if (modelCollection.size > 0) {
            const foundId = modelCollection.values().next().value.id;
            if (foundId !== model.id) {
                errors[fieldName] = i18n.t('{{fieldDisplayName}} is already taken', {
                    fieldDisplayName,
                });
            }
        }
        return errors;
    } catch (error) {
        const fallBackMsg = i18n.t(
            'Could not verify if this {{fieldDisplayName}} is unique',
            {
                fieldDisplayName,
            }
        );

        errors[fieldName] = createHumanErrorMessage(error, fallBackMsg);
        throw errors;
    }
};

export default asyncValidateUniqueness;