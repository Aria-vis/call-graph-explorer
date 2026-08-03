#include <bits/stdc++.h>
#define quickio              \
    ios::sync_with_stdio(0); \
    cin.tie(0);
#define ll long long
#define ld long double
using namespace std;

void f(int n, int x)
{
    cout << "Enter : n = " << n << " x = " << x << '\n';

    if (n <= 0)
    {
        cout << "Base Case : n = " << n << " x = " << x << '\n';
        return;
    }

    f(n - 1, x + 1);

    cout << "Middle A : n = " << n << " x = " << x << '\n';

    if (n % 2)
        f(n - 2, x * 2);
    else
        f(n - 1, x - 1);

    cout << "Middle B : n = " << n << " x = " << x << '\n';

    if (x % 2 == 0)
        f(n - 3, x + n);

    cout << "Exit : n = " << n << " x = " << x << '\n';
}

int main()
{
    quickio;

    f(4, 1);

    return 0;
}