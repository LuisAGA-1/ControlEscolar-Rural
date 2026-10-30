using Npgsql;

namespace ControlEscolar.Data;

public static class DatabaseConnection
{
    private static string connectionString = string.Empty;

    public static void Configure(string connection)
    {
        connectionString = connection;
    }

    public static NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(connectionString);
    }
}