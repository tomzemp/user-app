import React, { Component } from 'react'
import { connect } from 'react-redux'
import List from '../../components/List'
import i18n from '@dhis2/d2-i18n'
import {
    isGroupContextActionAllowed,
    groupContextMenuIcons,
    groupContextMenuActions,
} from './GroupContextMenuActions'
import { USER_GROUP } from '../../constants/entityTypes'
import SearchFilter from '../../components/SearchFilter'

/**
 * Container component that renders a List component with correct properties for displaying a list of UserGroups
 */
class GroupList extends Component {
    render() {
        return (
            <List
                entityType={USER_GROUP}
                filterComponent={SearchFilter}
                columns={['displayName', 'currentUserIsMember']}
                primaryAction={groupContextMenuActions.edit}
                contextMenuActions={groupContextMenuActions}
                contextMenuIcons={groupContextMenuIcons}
                isContextActionAllowed={isGroupContextActionAllowed}
                sectionName={i18n.t('User Group Management')}
                newItemPath={'/user-groups/new'}
                className={'group-list'}
            />
        )
    }
}

const mapStateToProps = state => {
    return {
        groupMemberships: state.currentUser.userGroups,
    }
}

export default connect(mapStateToProps)(GroupList)
