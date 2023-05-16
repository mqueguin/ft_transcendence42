import { ref, shallowRef } from 'vue'
import SignupForm from '../components/SignupForm.vue'
import SigninForm from '../components/SigninForm.vue'
import FirstConnection from '../components/FirstConnection.vue'
import UpdatePicture from '../components/UpdatePicture.vue'

const show = ref(false);
const component = shallowRef();

export function useModal() {
	return {
		show,
		component,
		showModal: (type: 'signUp' | 'signIn' | 'firstConnection' | 'updatePicture' ) => {
			show.value = true
			switch (type) {
				case 'signIn': return component.value = SigninForm
				case 'signUp': return component.value = SignupForm
				case 'firstConnection': return component.value = FirstConnection
				case 'updatePicture': return component.value = UpdatePicture
			}
		},
		whichModal: () => {
			if (component.value === SignupForm) return true
			else return false
		},
		hideModal: () => {		
			show.value = false,
			component.value = null
		},
	}
}