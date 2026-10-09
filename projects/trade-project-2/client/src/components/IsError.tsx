import errIcon from '../assets/alert-error-svgrepo-com.svg';

export default function IsError({error}: {error: string}){
    return(
        <div>
            {error}
            <img src={errIcon} alt="Error!"/>
        </div>
    )
}
