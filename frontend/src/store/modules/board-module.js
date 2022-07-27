import { boardService } from '../../services/board-service'
import { utilService } from '../../services/util-service.js'
import { applyDrag } from '../../services/dnd-util.service'

export default {
    state: {
        boards: [],
        currBoard: null,
        previousBoardState: null,
        currTaskData: null,
    },
    getters: {
        board({ currBoard }) {
            return currBoard
        },
        templateBoards({ boards }) {
            return boards.filter(board => !board.isTemplate)
        },
        boards({ boards }) {
            return boards.filter(board => board.isTemplate)
        },
        boardMembers({ currBoard }) {
            return currBoard.members
        },
        boardLabels({ currBoard }) {
            return currBoard.labels
        },
        groups({ currBoard }) {
            return currBoard.groups
        },
        currTaskData({ currTaskData }) {
            return currTaskData
        }
    },
    mutations: {
        undo(state) {
            state.currBoard = state.previousBoardState
        },
        savePrevState(state) {
            state.previousBoardState = state.currBoard
        },

        setBoards(state, { boards }) {
            state.boards = boards
        },
        updateBoard(state, { updatedBoard }) {
            state.currBoard = updatedBoard
        },
        setCurrTask(state, { groupId, taskId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            state.currTaskData = { group, task }
        },
        board(state, { change, board }) {
            const idx = state.boards.findIndex(b => b._id === board._id)
            switch (change) {
                case 'add':
                    state.boards.push(board)
                    state.currBoard = board
                    break
                case 'update':
                    state.boards.splice(idx, 1, board)
                    break
                case 'remove':
                    state.boards.splice(idx, 1)
                    break
                case 'set':
                    state.currBoard = board
            }
        },
        changeBoardTitle(state, { title }) {
            state.currBoard.title = title
        },
        //group
        duplicateGroup(state, { group }) {
            group.id = utilService.makeId()
            state.currBoard.groups.push(group)
        },
        toggleWatchGroup(state, { groupId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            if (group.isWatched) group.isWatched = false
            else group.isWatched = true
        },
        sortGroup(state, { groupId, sortBy }) {
            let tasks = state.currBoard.groups.find(g => g.id === groupId).tasks
            if (sortBy === 'alphabet') tasks = tasks.sort((a, b) => (a.title.localeCompare(b.title)))
            else tasks = tasks.sort((a, b) => (a.createdAt - b.createdAt) * (sortBy === 'oldest' ? 1 : -1))
        },
        archiveGroup(state, { groupId }) {
            const groupIdx = state.currBoard.groups.findIndex(g => g.id === groupId)
            state.currBoard.groups.splice(groupIdx, 1)
        },
        //task
        editTaskTitle(state, { taskId, groupId, title }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            task.title = title
        },
        saveTaskDescription(state, { taskId, groupId, description }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            task.description = description
        },
        archiveTask(state, { taskId, groupId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const taskIdx = group.tasks.findIndex(t => t.id === taskId)
            group.tasks.splice(taskIdx, 1)
        },
        archiveAllTasks(state, { groupId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            group.tasks = []
        },
        toggleWatchTask(state, { taskId, groupId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            task.isWatched = task.isWatched ? false : true
        },
        moveTask(state, { from, to }) {
            //moving the task from the previous group
            const originGroup = state.currBoard.groups.find(g => g.id === from.groupId)
            const originTaskIdx = originGroup.tasks.findIndex(t => t.id === from.taskId)
            const taskToMove = originGroup.tasks.splice(originTaskIdx, 1)[0] //extract the moved task
            //to the new group at the specified location
            const destGroup = state.currBoard.groups.find(g => g.id === to.groupId)
            destGroup.tasks.splice(to.idx, 0, taskToMove) //insert at wanted location
        },
        //attachments
        saveAttachment(state, { taskId, groupId, attachment }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            if (!task.attachments) task.attachments = []
            task.attachments.push(attachment)
        },
        removeAttachment(state, { taskId, groupId, idx }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            task.attachments.splice(idx, 1)
        },
        //labels
        toggleLabel(state, { taskId, groupId, labelId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)

            const labelIdx = task.labelIds.findIndex(id => id === labelId)
            if (labelIdx !== -1) task.labelIds.splice(labelIdx, 1)
            else if (task.labelIds.length < 4) task.labelIds.push(labelId)
        },
        saveLabel(state, { taskId, groupId, label }) {
            console.log('ss');
            //boardwide
            if (label.id) {
                const idx = state.currBoard.labels.findIndex(l => l.id === label.id)
                state.currBoard.labels.splice(idx, 1, label)
            } else {
                const group = state.currBoard.groups.find(g => g.id === groupId)
                const task = group.tasks.find(t => t.id === taskId)
                if (task.labelIds.length >= 4) return
                label.id = utilService.makeId()
                state.currBoard.labels.push(label)
                task.labelIds.push(label.id)
            }
        },
        //members
        toggleMember(state, { taskId, groupId, memberId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            const memberIdx = task.memberIds.findIndex(mId => mId === memberId)
            if (memberIdx !== -1) task.memberIds.splice(memberIdx, 1)
            else task.memberIds.push(memberId)
        },
        toggleBoardStarred({ currBoard }, { board }) {
            const toggeledBoard = board ? board : currBoard
            toggeledBoard.isStarred = !toggeledBoard.isStarred
            // currBoard.isStarred = !currBoard.isStarred
        },
        toggleLabelsText({ currBoard }, { board }) {
            // const toggeledBoard = board ? board : currBoard
            // toggeledBoard.isStarred = !toggeledBoard.isStarred
            currBoard.isLabelsTextShow = !currBoard.isLabelsTextShow
        },
        //todos
        newTodoList(state, { taskId, groupId, title }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            const list = {
                title,
                id: utilService.makeId(),
                todos: [],
            }
            if (!task.todoLists) task.todoLists = []
            task.todoLists.push(list)
        },
        addTodo(state, { taskId, groupId, listId, title }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            const list = task.todoLists.find(l => l.id === listId)
            const todo = {
                title,
                id: utilService.makeId(),
                isDone: false,
            }
            list.todos.push(todo)
        },
        toggleTodo(state, { taskId, groupId, listId, todoId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            const list = task.todoLists.find(l => l.id === listId)
            const todo = list.todos.find(td => td.id === todoId)
            todo.isDone = !todo.isDone
            const doneTodosNum = list.todos.filter(td => td.isDone).length
            list.prograss = parseInt((doneTodosNum / list.todos.length) * 100) + '%'
        },
        deleteTodoList(state, { taskId, groupId, listId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            const listIdx = task.todoLists.findIndex(l => l.id === listId)
            task.todoLists.splice(listIdx, 1)
        },
        toggleHideChecked(state, { taskId, groupId, listId }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            const list = task.todoLists.find(l => l.id === listId)
            list.checkedHidden = list.checkedHidden ? false : true

        },
        //due-date
        setDueDate(state, { taskId, groupId, dueDate }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            task.dueDate = dueDate
        },
        //cover
        setCover(state, { taskId, groupId, cover }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const task = group.tasks.find(t => t.id === taskId)
            if (cover === 'reset') task.cover = null
            else task.cover = cover
        },
        //d&d
        dragTask(state, { groupIndex, board, newGroup }) {
            board.groups.splice(groupIndex, 1, newGroup)
            state.currBoard = board
        },
        group(state, { change, group }) {
            const idx = state.currBoard.groups.findIndex(g => g.id === group.id)
            switch (change) {
                case 'add':
                    state.currBoard.groups.push(group)
                    break
                case 'update':
                    state.currBoard.groups.splice(idx, 1, group)
                    break
                case 'remove':
                    state.currBoard.groups.splice(idx, 1)
                    break
            }
        },
        task(state, { change, groupId, task }) {
            const group = state.currBoard.groups.find(g => g.id === groupId)
            const idx = group.tasks.findIndex(t => t.id === task.id)
            switch (change) {
                case 'add':
                    group.tasks.push(task)
                    break
                case 'update':
                    group.tasks.splice(idx, 1, task)
                    state.currTaskData.task = task
                    break
                case 'remove': {
                    group.tasks.splice(idx, 1)
                }
            }
        },
        setBg(state, { background }) {
            state.currBoard.style.background = background
        },
        clearCurrBoard(state) {
            state.currBoard = null
        }
    },
    actions: {
        clearCurrBoard({ commit }) {
            commit({ type: 'clearCurrBoard' })
        },
        async loadBoards({ commit }) {
            try {
                const boards = await boardService.query()
                commit({ type: 'setBoards', boards })
            } catch {
                console.log('couldnt load boards')
            }
        },
        async board({ commit }, { action, board }) {
            try {
                let change
                if (action === 'save') {
                    change = board._id ? 'update' : 'add'
                    board = await boardService.saveBoard(board)
                } else if (action === 'remove') {
                    change = 'remove'
                    await boardService.removeBoard(board._id)
                } else if (action === 'set') {
                    change = 'set'
                    board = await boardService.getById(board)
                    boardService.setCurrBoard(board)
                }
                commit({ type: 'board', change, board })
            } catch (err) {
                console.error(err)
            }
        },
        async saveBoard({ state }, { payload }) {
            const changedBoard = payload.board ? payload.board : state.currBoard
            try {
                await boardService.saveBoard(changedBoard)
            } catch (err) {
                console.error(err)
                commit({ type: 'undo' })
            }
        },
        async group({ commit }, { action, group }) {
            try {
                let change
                if (action === 'save') {
                    change = group.id ? 'update' : 'add'
                    group = await boardService.saveGroup(group)
                } else if (action === 'remove') {
                    change = action
                    await boardService.removeGroup(group)
                }
                commit({ type: 'group', change, group })
            } catch (err) {
                console.error(err)
            }
        },
        async task({ commit }, { action, groupId, task }) {
            try {
                let change
                if (action === 'save') {
                    change = task.id ? 'update' : 'add'
                    task = await boardService.saveTask(groupId, task)
                } else if (action === 'remove') {
                    change = action
                    await boardService.removeTask(groupId, task)
                }
                commit({ type: 'task', change, groupId, task })
            } catch (err) {
                console.error(err)
            }
        },
        setState({ commit, dispatch }, payload) {
            const { action, groupId, taskId } = payload
            payload.type = action
            commit({ type: 'savePrevState' }) //in case of an error
            commit(payload) //update state
            commit({ type: 'pushActivity', action, groupId, taskId }) //save activity
            dispatch({ type: 'saveBoard', payload }) //save to db
        },

        //d&d
        async updateGroups({ commit }, { groups }) {
            // console.log('groups:', groups)
            const updatedBoard = await boardService.updateGroups(groups)
            // commit({ type: 'board', change: 'update', board: updatedBoard })
            commit({ type: 'board', change: 'set', board: updatedBoard })
        },
        async onColumnDrop({ state, commit, dispatch }, { dropResult }) {
            const board = Object.assign({}, state.currBoard)
            board.groups = applyDrag(board.groups, dropResult)
            commit({ type: 'board', change: 'set', board })

            const updatedBoard = await boardService.updateGroups(board.groups)
        },
        async onCardDrop({ state, commit, dispatch }, { groupId, dropResult }) {
            if (dropResult.removedIndex !== null || dropResult.addedIndex !== null) {
                const board = Object.assign({}, state.currBoard)
                const group = board.groups.filter(g => g.id === groupId)[0]
                const groupIndex = board.groups.indexOf(group)
                const newGroup = Object.assign({}, group)
                newGroup.tasks = applyDrag(newGroup.tasks, dropResult)
                // board.groups.splice(groupIndex, 1, newGroup)
                // this.scene = scene
                commit({ type: 'dragTask', groupIndex, board, newGroup })
                // commit({ type: 'board', change: 'dragTask', board })

                const updatedBoard = await boardService.updateGroups(board.groups)
            }
        },
    },
}
