import { Link } from "react-router-dom";

function ErrorPage() {
    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>🚫 비정상적인 접근입니다.</h1>
            <p>이 페이지에 접근할 수 없습니다.</p>
            <Link to="/">홈으로 돌아가기</Link>
        </div>
    );
}

export default ErrorPage;